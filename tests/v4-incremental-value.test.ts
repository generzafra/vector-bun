import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import { TenantContextError, incrementalValueStatement } from '@vector/contracts';
import {
	db,
	experimentResults,
	experiments,
	funnels,
	latestExperimentResultForTenant,
	pages,
	sites,
	upsertDataHealthCheckForTenant
} from '@vector/db';
import {
	contextFor,
	getClientValueProof,
	login,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';

const root = join(import.meta.dir, '..');

const clean = {
	sampleMet: true,
	horizonMet: true,
	botContamination: false,
	sourceImbalance: false,
	controlPrimaryCount: 10,
	challengerPrimaryCount: 14,
	primaryMetric: 'lead_created'
};

test('incremental value is a count and stays unknown without clean coverage', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/value/+page.svelte'), 'utf8');
	expect(page).toContain('Experiment difference');
	const blocked = incrementalValueStatement({ dataHealth: 'unknown', result: clean });
	expect(blocked.status).toBe('unknown');
	expect(blocked.difference).toBeNull();
	expect(blocked.detail).not.toContain('14');
	expect(
		incrementalValueStatement({ dataHealth: 'estimated', result: clean }).difference
	).toBeNull();
	const dirty = incrementalValueStatement({
		dataHealth: 'observed',
		result: { ...clean, sampleMet: false, challengerPrimaryCount: 900 }
	});
	expect(dirty.difference).toBeNull();
	expect(dirty.detail).not.toContain('900');
	const linked = incrementalValueStatement({ dataHealth: 'observed', result: clean });
	expect(linked.status).toBe('observed');
	expect(linked.difference).toBe(4);
	expect(linked.detail).toContain('4 more on the challenger');
	expect(linked.detail).toContain('not added to recorded revenue');
	expect(linked.detail.toLowerCase()).not.toContain('roi');
	expect(
		incrementalValueStatement({
			dataHealth: 'observed',
			result: { ...clean, primaryMetric: 'revenue' }
		}).detail
	).not.toContain('on revenue');
	expect(incrementalValueStatement({ dataHealth: 'observed', result: null }).detail).toContain(
		'No experiment result'
	);
});

test(
	'a clean experiment difference stays on its client and waits for data health',
	async () => {
		const { session } = await login(
			{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
			'10.0.26.10'
		);
		const north = await createClient(
			session,
			{
				name: 'V4 Northline House',
				slug: `v4n-${crypto.randomUUID().slice(0, 8)}`,
				timezone: 'UTC'
			},
			'v4-north'
		);
		const south = await createClient(
			session,
			{ name: 'V4 Southline Inn', slug: `v4s-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
			'v4-south'
		);
		await switchActiveClient(session, session.token, north.id, 'v4-switch');
		const actor = await resolveSession(session.token);
		if (!actor) throw new Error('session missing');
		const ctx = contextFor(actor, 'v4-ctx');
		const [site] = await db
			.insert(sites)
			.values({
				organizationId: ctx.organizationId,
				clientId: ctx.clientId,
				name: 'V4 site'
			})
			.returning();
		const [funnel] = await db
			.insert(funnels)
			.values({
				organizationId: ctx.organizationId,
				clientId: ctx.clientId,
				siteId: site!.id,
				name: 'Home',
				slug: 'home'
			})
			.returning();
		const [page] = await db
			.insert(pages)
			.values({
				organizationId: ctx.organizationId,
				clientId: ctx.clientId,
				funnelId: funnel!.id,
				title: 'Home'
			})
			.returning();
		const [experiment] = await db
			.insert(experiments)
			.values({
				organizationId: ctx.organizationId,
				clientId: ctx.clientId,
				pageId: page!.id,
				name: 'Hero contrast',
				status: 'decided',
				primaryMetric: 'lead_created',
				guardrailMetrics: [],
				minDurationDays: 14,
				minSamplePerVariant: 100,
				decisionRule: 'fixed_horizon',
				rollbackRule: 'pause_experiment'
			})
			.returning();
		await db.insert(experimentResults).values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			experimentId: experiment!.id,
			horizonMet: true,
			sampleMet: true,
			botContamination: false,
			sourceImbalance: false,
			earlyStopBlocked: true,
			decisionReady: true,
			botShareBps: 0,
			controlSample: 120,
			challengerSample: 120,
			controlPrimaryCount: 10,
			challengerPrimaryCount: 14,
			computedAt: new Date('2026-10-01T00:00:00.000Z')
		});
		const waiting = await getClientValueProof(actor, ctx);
		expect(waiting.incremental.difference).toBeNull();
		expect(waiting.incremental.detail).not.toContain('14');

		await upsertDataHealthCheckForTenant(ctx, {
			checkKey: 'production_page_views',
			status: 'healthy',
			detail: 'Tracking looks healthy.'
		});
		const shown = await getClientValueProof(actor, ctx);
		expect(shown.incremental.status).toBe('observed');
		expect(shown.incremental.difference).toBe(4);
		expect(shown.incremental.detail).toContain('not added to recorded revenue');
		expect(JSON.stringify(shown)).not.toContain('V4 Southline Inn');

		await db.insert(experimentResults).values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			experimentId: experiment!.id,
			horizonMet: true,
			sampleMet: false,
			botContamination: false,
			sourceImbalance: false,
			earlyStopBlocked: true,
			decisionReady: false,
			botShareBps: 0,
			controlSample: 4,
			challengerSample: 4,
			controlPrimaryCount: 1,
			challengerPrimaryCount: 900,
			computedAt: new Date('2026-10-08T00:00:00.000Z')
		});
		const held = await getClientValueProof(actor, ctx);
		expect(held.incremental.difference).toBeNull();
		expect(held.incremental.detail).not.toContain('900');

		await switchActiveClient(session, session.token, south.id, 'v4-south-switch');
		const southActor = await resolveSession(session.token);
		if (!southActor) throw new Error('session missing');
		const other = await getClientValueProof(southActor, contextFor(southActor, 'v4-south'));
		expect(other.incremental.difference).toBeNull();
		expect(JSON.stringify(other)).not.toContain('4 more');
		expect(JSON.stringify(other)).not.toContain('900');

		try {
			await latestExperimentResultForTenant(undefined as never);
			throw new Error('expected a tenant error');
		} catch (error) {
			expect(error).toBeInstanceOf(TenantContextError);
		}
	},
	{ timeout: 20_000 }
);
