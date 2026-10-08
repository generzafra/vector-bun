import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	attributionCoverage,
	attributionEvidenceClass,
	capRecommendationConfidence,
	highImpactAutoExecuteGate,
	storedAttributionEvidence
} from '@vector/contracts';
import { evaluateAutoExecute, evaluateConditionalAutoExecute } from '@vector/ai';
import { attributionResults, db, persistCapturedLead } from '@vector/db';
import {
	contextFor,
	getAttributionConfidence,
	listLeads,
	login,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

const promotePolicy = {
	actionType: 'experiment.promote_winner',
	riskClass: 'content' as const,
	maxAutonomy: 4,
	autoExecuteAllowed: true,
	forbidden: false,
	financialLimitMinor: 0
};

const level4 = {
	pausedGlobal: false,
	pausedClient: false,
	autonomyCeiling: 4,
	requestedAutonomy: 4,
	confidence: 100,
	actionType: 'experiment.promote_winner',
	policy: promotePolicy
};

test('unknown attribution is not measured, and estimated is not assigned from missing data', () => {
	const samples = [
		{},
		{ lastNonDirectChannel: null, lastNonDirectCampaign: null },
		{ lastNonDirectChannel: '', lastNonDirectCampaign: 'spring' },
		{ lastNonDirectChannel: 'direct', lastNonDirectCampaign: '   ' },
		{ lastNonDirectChannel: 'direct' },
		{ lastNonDirectChannel: 'referral', lastNonDirectSource: 'news.example' },
		{ lastNonDirectChannel: 'campaign', lastNonDirectCampaign: '' },
		{ lastNonDirectChannel: 'campaign', lastNonDirectCampaign: 'spring' }
	];
	for (const sample of samples) {
		expect(attributionEvidenceClass(sample)).not.toBe('estimated');
	}
	expect(attributionEvidenceClass({})).toBe('unknown');
	expect(attributionEvidenceClass({ lastNonDirectChannel: 'direct' })).toBe('inferred');
	expect(attributionEvidenceClass({ lastNonDirectChannel: 'referral' })).toBe('observed');
	expect(
		attributionEvidenceClass({ lastNonDirectChannel: 'campaign', lastNonDirectCampaign: 'spring' })
	).toBe('measured');
	expect(attributionCoverage({ leadCount: 0, classes: [] }).evidenceClass).toBe('unknown');
	expect(attributionCoverage({ leadCount: 0, classes: [] }).highImpactAutoExecute).toBe(false);
	expect(attributionCoverage({ leadCount: 1, classes: ['unknown'] }).evidenceClass).not.toBe(
		'measured'
	);
	expect(
		highImpactAutoExecuteGate(attributionCoverage({ leadCount: 1, classes: ['unknown'] })).allowed
	).toBe(false);
	expect(
		highImpactAutoExecuteGate(attributionCoverage({ leadCount: 1, classes: ['estimated'] })).allowed
	).toBe(false);
	expect(
		highImpactAutoExecuteGate(attributionCoverage({ leadCount: 2, classes: ['measured'] })).allowed
	).toBe(false);
	expect(
		highImpactAutoExecuteGate(attributionCoverage({ leadCount: 1, classes: ['measured'] })).allowed
	).toBe(true);
	expect(capRecommendationConfidence(100, 'unknown')).toBe(0);
	expect(capRecommendationConfidence(100, 'estimated')).toBe(20);
	expect(capRecommendationConfidence(80, 'inferred')).toBe(40);
	expect(capRecommendationConfidence(80, 'observed')).toBe(60);
	expect(capRecommendationConfidence(80, 'measured')).toBe(80);
	expect(storedAttributionEvidence('estimated')).toBe('estimated');
	expect(storedAttributionEvidence('not-a-class')).toBe('unknown');

	expect(
		evaluateAutoExecute({
			pausedGlobal: false,
			pausedClient: false,
			autonomyCeiling: 3,
			requestedAutonomy: 3,
			confidence: 100,
			actionType: 'internal_weekly_report',
			policy: {
				actionType: 'internal_weekly_report',
				riskClass: 'low',
				maxAutonomy: 3,
				autoExecuteAllowed: true,
				forbidden: false,
				financialLimitMinor: 0
			}
		}).allowed
	).toBe(true);
	expect(evaluateConditionalAutoExecute(level4).allowed).toBe(true);
	expect(
		evaluateConditionalAutoExecute({ ...level4, attributionEvidence: 'measured' }).allowed
	).toBe(true);
	for (const evidence of ['unknown', 'observed', 'inferred', 'estimated'] as const) {
		expect(evaluateConditionalAutoExecute({ ...level4, attributionEvidence: evidence })).toEqual({
			allowed: false,
			blockedBy: 'attribution_coverage'
		});
	}

	const page = readFileSync(join(root, 'apps/control/src/routes/leads/+page.svelte'), 'utf8');
	expect(page).toContain('This is the source already stored for these leads.');
	expect(page).toContain(
		'Mark what happened, or connect a CRM later. Vector will not invent sales.'
	);
	expect(page).not.toContain('caused the sale');
});

async function scopedActor(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `o12-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o12-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o12-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o12-ctx') };
}

async function persistLead(
	ctx: ReturnType<typeof contextFor>,
	input: { email: string; channel: string; campaign?: string | null; source?: string | null }
) {
	return persistCapturedLead(ctx, {
		displayName: 'O12 Lead',
		email: input.email,
		hostname: 'o12.example.test',
		domainKind: 'preview',
		isTest: true,
		siteId: crypto.randomUUID(),
		funnelId: crypto.randomUUID(),
		pageId: crypto.randomUUID(),
		pageVersionId: crypto.randomUUID(),
		source: {
			channel: input.channel,
			utmSource: input.source ?? null,
			utmCampaign: input.campaign ?? null
		},
		attribution: {
			firstTouchChannel: input.channel,
			firstTouchSource: input.source ?? null,
			firstTouchCampaign: input.campaign ?? null,
			lastNonDirectChannel: input.channel,
			lastNonDirectSource: input.source ?? null,
			lastNonDirectCampaign: input.campaign ?? null
		},
		score: 20,
		scoreReason: 'lead_score_v1',
		consents: [
			{
				purpose: 'lead_follow_up',
				decision: 'granted',
				copyVersion: 1,
				evidence: { hostname: 'o12.example.test', copyVersion: 1, text: 'Follow up' }
			},
			{
				purpose: 'marketing',
				decision: 'denied',
				copyVersion: 1,
				evidence: { hostname: 'o12.example.test', copyVersion: 1, text: 'Marketing' }
			}
		],
		formSubmittedEventId: crypto.randomUUID(),
		leadCreatedEventId: crypto.randomUUID(),
		taxonomyVersion: 1,
		requestId: 'o12-persist'
	});
}

test('attribution confidence stays on the owning client and locks incomplete coverage', async () => {
	const { actor, ctx, created } = await scopedActor('O12 Attribution', '10.0.26.10');
	const empty = await getAttributionConfidence(actor, ctx);
	expect(empty.evidenceClass).toBe('unknown');
	expect(empty.highImpact.allowed).toBe(false);
	expect(empty.recommendationConfidenceCap).toBe(0);

	const directEmail = `o12-direct-${crypto.randomUUID()}@o12.test`;
	await persistLead(ctx, { email: directEmail, channel: 'direct' });
	const inferred = await getAttributionConfidence(actor, ctx);
	expect(inferred.evidenceClass).toBe('inferred');
	expect(inferred.highImpact.blockedBy).toBe('attribution_coverage');
	expect(inferred.recommendationConfidenceCap).toBe(40);

	const campaign = 'o12-measured-campaign';
	const measuredEmail = `o12-measured-${crypto.randomUUID()}@o12.test`;
	await persistLead(ctx, {
		email: measuredEmail,
		channel: 'campaign',
		source: 'google',
		campaign
	});
	const mixed = await getAttributionConfidence(actor, ctx);
	expect(mixed.evidenceClass).toBe('inferred');
	expect(mixed.highImpact.allowed).toBe(false);

	const listed = await listLeads(actor, ctx);
	const measuredLead = listed.find((row) => row.contact.email === measuredEmail);
	const directLead = listed.find((row) => row.contact.email === directEmail);
	expect(measuredLead?.attribution?.evidenceClass).toBe('measured');
	expect(directLead?.attribution?.evidenceClass).toBe('inferred');

	const onlyMeasured = await scopedActor('O12 Measured', '10.0.26.11');
	await persistLead(onlyMeasured.ctx, {
		email: `o12-only-${crypto.randomUUID()}@o12.test`,
		channel: 'campaign',
		source: 'google',
		campaign: 'o12-only-campaign'
	});
	const covered = await getAttributionConfidence(onlyMeasured.actor, onlyMeasured.ctx);
	expect(covered.evidenceClass).toBe('measured');
	expect(covered.highImpact.allowed).toBe(true);
	expect(covered.recommendationConfidenceCap).toBe(100);
	expect(covered.detail).not.toContain('caused');

	const referral = await scopedActor('O12 Observed', '10.0.26.14');
	await persistLead(referral.ctx, {
		email: `o12-ref-${crypto.randomUUID()}@o12.test`,
		channel: 'referral',
		source: 'news.example'
	});
	const observed = await getAttributionConfidence(referral.actor, referral.ctx);
	expect(observed.evidenceClass).toBe('observed');
	expect(observed.highImpact.allowed).toBe(false);

	const reserved = await scopedActor('O12 Estimated', '10.0.26.15');
	const reservedLead = await persistLead(reserved.ctx, {
		email: `o12-est-${crypto.randomUUID()}@o12.test`,
		channel: 'direct'
	});
	await db
		.update(attributionResults)
		.set({ evidenceClass: 'estimated' })
		.where(
			and(
				eq(attributionResults.clientId, reserved.ctx.clientId),
				eq(attributionResults.leadId, reservedLead.lead.id)
			)
		);
	const estimated = await getAttributionConfidence(reserved.actor, reserved.ctx);
	expect(estimated.evidenceClass).toBe('estimated');
	expect(estimated.highImpact.allowed).toBe(false);
	expect(estimated.recommendationConfidenceCap).toBe(20);
	const estimatedRow = (await listLeads(reserved.actor, reserved.ctx)).find(
		(row) => row.id === reservedLead.lead.id
	);
	expect(estimatedRow?.attribution?.evidenceClass).toBe('estimated');

	const other = await scopedActor('O12 Other', '10.0.26.16');
	const otherView = await getAttributionConfidence(other.actor, other.ctx);
	expect(otherView.evidenceClass).toBe('unknown');
	const otherLeads = await listLeads(other.actor, other.ctx);
	expect(JSON.stringify(otherLeads)).not.toContain(campaign);
	expect(JSON.stringify(otherLeads)).not.toContain(measuredEmail);
	let crossed: unknown = null;
	try {
		await getAttributionConfidence(other.actor, other.ctx, created.id);
	} catch (error) {
		crossed = error;
	}
	expect(crossed).toBeInstanceOf(TenantContextError);
	const hidden = await getAttributionConfidence(
		{ ...actor, permissions: actor.permissions.filter((cap) => cap !== 'leads.read') },
		ctx
	).catch((error: unknown) => error);
	expect(hidden).toBeInstanceOf(ForbiddenError);

	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.26.12'
	);
	let userCross: unknown = null;
	try {
		await listLeads(session, contextFor(session, 'o12-alpha'), created.id);
	} catch (error) {
		userCross = error;
	}
	expect(userCross).toBeInstanceOf(TenantContextError);
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.26.13' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const body = (await loginRes.json()) as { data: { csrf: string } };
	const res = await app.request(`/v1/leads/${created.id}`, {
		headers: { cookie: sessionCookie(loginRes), 'x-csrf-token': body.data.csrf }
	});
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text).not.toContain(campaign);
	expect(text).not.toContain(measuredEmail);
	expect(text).not.toContain(created.name);

	const stored = await db
		.select({
			channel: attributionResults.lastNonDirectChannel,
			campaignId: attributionResults.lastNonDirectCampaign,
			evidenceClass: attributionResults.evidenceClass
		})
		.from(attributionResults)
		.limit(40);
	for (const row of stored) {
		if (row.evidenceClass === 'estimated') continue;
		expect(row.evidenceClass).toBe(
			attributionEvidenceClass({
				lastNonDirectChannel: row.channel,
				lastNonDirectCampaign: row.campaignId
			})
		);
	}
}, 20_000);
