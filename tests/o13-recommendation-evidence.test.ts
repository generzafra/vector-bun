import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	ValidationError,
	recommendationConfidenceAfterDataHealth,
	recommendationDataHealthGate
} from '@vector/contracts';
import {
	aiDecisions,
	db,
	listRecommendationEvidenceForTenant,
	upsertDataHealthCheckForTenant
} from '@vector/db';
import {
	contextFor,
	decideIntelligenceApproval,
	listRecommendationEvidence,
	login,
	resolveSession,
	runIntelligence,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

test('incomplete data health blocks an important recommendation and unknown is not observed', () => {
	const unknown = [{ status: 'unknown' }];
	const warning = [{ status: 'warning' }];
	const broken = [{ status: 'broken' }];
	const healthy = [{ status: 'healthy' }, { status: 'healthy' }];
	const financial = { riskClass: 'financial', recommendedAutonomy: 1 };
	const content = { riskClass: 'content', recommendedAutonomy: 1 };
	const autonomous = { riskClass: 'low', recommendedAutonomy: 3 };

	expect(recommendationDataHealthGate([], financial).allowed).toBe(false);
	expect(recommendationDataHealthGate([], financial).evidenceClass).toBe('unknown');
	expect(recommendationDataHealthGate(unknown, financial).evidenceClass).not.toBe('observed');
	expect(recommendationDataHealthGate(warning, financial).allowed).toBe(false);
	expect(recommendationDataHealthGate(broken, financial).allowed).toBe(false);
	expect(recommendationDataHealthGate(healthy, financial).allowed).toBe(true);
	expect(recommendationDataHealthGate(unknown, content).allowed).toBe(true);
	expect(recommendationDataHealthGate(unknown, autonomous).allowed).toBe(false);
	expect(
		recommendationConfidenceAfterDataHealth(80, recommendationDataHealthGate(healthy, financial))
	).toBe(80);
	expect(
		recommendationConfidenceAfterDataHealth(80, recommendationDataHealthGate(unknown, financial))
	).toBe(0);
	expect(
		recommendationConfidenceAfterDataHealth(80, recommendationDataHealthGate(warning, financial))
	).toBe(20);

	const page = readFileSync(
		join(root, 'apps/control/src/routes/intelligence/+page.svelte'),
		'utf8'
	);
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0045_o13_recommendation_evidence.sql'),
		'utf8'
	);
	expect(page).toContain('overview.dataHealth.detail');
	expect(page).toContain('row.description');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(migration).toContain('client_id');
});

async function scopedActor(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `o13-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o13-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o13-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o13-ctx') };
}

test('recommendation evidence stays on the owning client, and incomplete data health blocks approval', async () => {
	const { actor, ctx, created } = await scopedActor('O13 Evidence', '10.0.27.10');
	const draft = await runIntelligence(actor, ctx, { agentKey: 'research' }, 'o13-research');
	if (!draft.decision || !draft.approval) throw new Error('research recommendation missing');
	expect(draft.decision.confidence).toBeGreaterThan(0);
	const evidence = await listRecommendationEvidence(actor, ctx);
	const own = evidence.filter((row) => row.recommendationId === draft.decision?.id);
	expect(
		own.some((row) => row.metricName === 'data_health' && row.evidenceType === 'unknown')
	).toBe(true);
	expect(own.some((row) => row.metricName === 'attribution_coverage')).toBe(true);
	expect(own.some((row) => row.description === 'Source coverage is unknown.')).toBe(true);
	expect(JSON.stringify(own)).not.toContain('caused');

	const low = await decideIntelligenceApproval(
		actor,
		ctx,
		{ id: draft.approval.id, decision: 'approved' },
		'o13-approve-low'
	);
	expect(low.executed).toBe(false);

	const important = await runIntelligence(actor, ctx, { agentKey: 'research' }, 'o13-important');
	if (!important.decision || !important.approval)
		throw new Error('important recommendation missing');
	await db
		.update(aiDecisions)
		.set({ riskClass: 'financial' })
		.where(and(eq(aiDecisions.id, important.decision.id), eq(aiDecisions.clientId, ctx.clientId)));
	let blocked: unknown = null;
	try {
		await decideIntelligenceApproval(
			actor,
			ctx,
			{ id: important.approval.id, decision: 'approved' },
			'o13-approve-financial'
		);
	} catch (error) {
		blocked = error;
	}
	expect(blocked).toBeInstanceOf(ValidationError);
	if (blocked instanceof ValidationError) {
		expect(blocked.message).toBe(
			'Data health is incomplete, so this recommendation cannot be approved.'
		);
	}

	await upsertDataHealthCheckForTenant(ctx, {
		checkKey: 'production_page_views',
		status: 'healthy',
		detail: 'Recorded page views.'
	});
	await upsertDataHealthCheckForTenant(ctx, {
		checkKey: 'lead_capture',
		status: 'healthy',
		detail: 'Recorded leads.'
	});
	const released = await decideIntelligenceApproval(
		actor,
		ctx,
		{ id: important.approval.id, decision: 'approved' },
		'o13-approve-healthy'
	);
	expect(released.executed).toBe(false);

	const other = await scopedActor('O13 Other', '10.0.27.11');
	const otherRows = await listRecommendationEvidence(other.actor, other.ctx);
	expect(otherRows.some((row) => row.recommendationId === important.decision?.id)).toBe(false);
	let crossed: unknown = null;
	try {
		await listRecommendationEvidence(other.actor, other.ctx, created.id);
	} catch (error) {
		crossed = error;
	}
	expect(crossed).toBeInstanceOf(TenantContextError);
	const hidden = await listRecommendationEvidence(
		{ ...actor, permissions: actor.permissions.filter((cap) => cap !== 'ai.read') },
		ctx
	).catch((error: unknown) => error);
	expect(hidden).toBeInstanceOf(ForbiddenError);
	await expect(listRecommendationEvidenceForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);

	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.27.12'
	);
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.27.13' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const body = (await loginRes.json()) as { data: { csrf: string } };
	const res = await app.request(`/v1/intelligence/${created.id}`, {
		headers: { cookie: sessionCookie(loginRes), 'x-csrf-token': body.data.csrf }
	});
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text).not.toContain(important.decision.id);
	expect(text).not.toContain(created.name);
	expect(session.clientId).not.toBe(created.id);
}, 30_000);
