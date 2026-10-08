import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import {
	NotFoundError,
	TenantContextError,
	creativeLearningHypothesis,
	type TenantContext
} from '@vector/contracts';
import {
	db,
	experimentDecisions,
	experimentLearningObjects,
	experimentResults,
	experimentVariants,
	experiments,
	getLatestDraftForTenant,
	getPublishedHomeForTenant,
	listCreativeLearningsForTenant,
	pageVersions
} from '@vector/db';
import {
	addService,
	composeFunnel,
	contextFor,
	login,
	recordCreativeLearning,
	resolveSession,
	saveBrand,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';

const root = join(import.meta.dir, '..');

const clean = {
	primaryMetric: 'lead_created',
	sampleMet: true,
	horizonMet: true,
	botContamination: false,
	sourceImbalance: false,
	controlPrimaryCount: 40,
	challengerPrimaryCount: 55,
	qualifiedLeads: null,
	sales: null
};

test('a design learning cites observed counts and does not apply itself', () => {
	const source = readFileSync(join(root, 'packages/contracts/src/creative-learning.ts'), 'utf8');
	expect(source).toContain('autoApply: false');
	expect(source).not.toContain('ROI');
	const learned = creativeLearningHypothesis(clean);
	const same = creativeLearningHypothesis({ ...clean, noveltyScore: 99 });
	expect(learned).toEqual(creativeLearningHypothesis({ ...clean, noveltyScore: 0 }));
	expect(learned).toEqual(same);
	expect(learned.status).toBe('hypothesis');
	expect(learned.evidence).toBe('observed');
	expect(learned.autoApply).toBe(false);
	expect(learned.statement).toContain('Observed leads created: challenger 55, control 40.');
	expect(learned.statement).toContain('Qualified leads are not attributed to these variants.');
	expect(learned.statement).toContain('Sales are not attributed to these variants.');
	expect(learned.statement).not.toContain('%');
	expect(learned.statement).not.toContain('$');

	const withOutcomes = creativeLearningHypothesis({
		...clean,
		qualifiedLeads: { control: 3, challenger: 4 },
		sales: { control: 1, challenger: 2 }
	});
	expect(withOutcomes.statement).toContain('Observed qualified leads: challenger 4, control 3.');
	expect(withOutcomes.statement).toContain('Observed sales: challenger 2, control 1.');

	const small = creativeLearningHypothesis({
		...clean,
		sampleMet: false,
		challengerPrimaryCount: 900,
		qualifiedLeads: { control: 17, challenger: 19 }
	});
	expect(small.status).toBe('insufficient');
	expect(small.evidence).toBe('unknown');
	expect(small.autoApply).toBe(false);
	expect(small.statement).toContain('Not enough clean observations');
	expect(small.statement).not.toContain('900');
	expect(small.statement).not.toContain('19');

	expect(creativeLearningHypothesis({ ...clean, botContamination: true }).status).toBe(
		'insufficient'
	);
	expect(
		creativeLearningHypothesis({ ...clean, primaryMetric: 'revenue' }).statement
	).not.toContain('revenue');
});

test('learning stays on this tenant experiment and does not publish', async () => {
	await expect(
		listCreativeLearningsForTenant(null as unknown as TenantContext)
	).rejects.toBeInstanceOf(TenantContextError);
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.21.10'
	);
	async function clientNamed(name: string) {
		const created = await createClient(
			session,
			{ name, slug: `ce7-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
			'ce7-create'
		);
		await switchActiveClient(session, session.token, created.id, 'ce7-switch');
		const actor = await resolveSession(session.token);
		if (!actor) throw new Error('session missing');
		const ctx = contextFor(actor, 'ce7-ctx');
		await saveBrand(
			actor,
			ctx,
			{
				displayName: name,
				audience: `Buyers considering ${name}`,
				offer: `A confirmed offer from ${name}`,
				primaryConversion: 'Request a walkthrough',
				brandPersonality: 'premium',
				tokens: { accent: '#111111', background: '#111111', text: '#f4f4f0' }
			},
			'ce7-brand'
		);
		await addService(
			actor,
			ctx,
			{
				name: 'Walkthrough',
				slug: `walk-${crypto.randomUUID().slice(0, 8)}`,
				outcome: 'A clear next step',
				summary: 'One meeting about the confirmed offer.'
			},
			'ce7-service'
		);
		const draft = await composeFunnel(actor, ctx, `ce7-compose-${created.id}`);
		return { actor, ctx, draft };
	}
	const north = await clientNamed('CE7 Northline House');
	const south = await clientNamed('CE7 Southline Inn');
	const before = await getLatestDraftForTenant(north.ctx);
	const [alternate] = await db
		.insert(pageVersions)
		.values({
			organizationId: north.ctx.organizationId,
			clientId: north.ctx.clientId,
			pageId: north.draft.page.id,
			version: north.draft.draft.version + 1,
			status: 'draft',
			document: north.draft.draft.document
		})
		.returning();
	const ready = await seedExperiment({
		ctx: north.ctx,
		pageId: north.draft.page.id,
		sampleMet: true,
		controlCount: 40,
		challengerCount: 55,
		controlPageVersionId: north.draft.draft.id,
		challengerPageVersionId: alternate.id
	});
	const thin = await seedExperiment({
		ctx: north.ctx,
		pageId: north.draft.page.id,
		sampleMet: false,
		controlCount: 1,
		challengerCount: 900,
		controlPageVersionId: null,
		challengerPageVersionId: null
	});

	const learned = await recordCreativeLearning(north.actor, north.ctx, ready.id, 'ce7-record');
	expect(learned.status).toBe('hypothesis');
	expect(learned.evidence).toBe('observed');
	expect(learned.autoApply).toBe(false);
	expect(learned.statement).toContain('challenger 55, control 40');
	expect(learned.statement).toContain('not attributed');
	expect(learned.statement).not.toContain('CE7 Southline Inn');
	expect(learned.statement).not.toContain('CE7 Northline House');
	expect(learned.controlPageVersionId).toBe(north.draft.draft.id);
	expect(learned.challengerPageVersionId).toBe(alternate.id);
	const again = await recordCreativeLearning(north.actor, north.ctx, ready.id, 'ce7-again');
	expect(again.id).toBe(learned.id);
	expect(again.statement).toBe(learned.statement);

	const held = await recordCreativeLearning(north.actor, north.ctx, thin.id, 'ce7-thin');
	expect(held.status).toBe('insufficient');
	expect(held.statement).not.toContain('900');
	expect(held.controlPageVersionId).toBeNull();

	expect(await listCreativeLearningsForTenant(south.ctx)).toEqual([]);
	await expect(
		recordCreativeLearning(south.actor, south.ctx, ready.id, 'ce7-cross')
	).rejects.toBeInstanceOf(NotFoundError);
	const after = await getLatestDraftForTenant(north.ctx);
	expect(after?.document.identity.displayName).toBe(before?.document.identity.displayName);
	expect(await getPublishedHomeForTenant(north.ctx)).toBeNull();
});

async function seedExperiment(input: {
	ctx: TenantContext;
	pageId: string;
	sampleMet: boolean;
	controlCount: number;
	challengerCount: number;
	controlPageVersionId: string | null;
	challengerPageVersionId: string | null;
}) {
	const [experiment] = await db
		.insert(experiments)
		.values({
			organizationId: input.ctx.organizationId,
			clientId: input.ctx.clientId,
			pageId: input.pageId,
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
	const [result] = await db
		.insert(experimentResults)
		.values({
			organizationId: input.ctx.organizationId,
			clientId: input.ctx.clientId,
			experimentId: experiment.id,
			horizonMet: true,
			sampleMet: input.sampleMet,
			botContamination: false,
			sourceImbalance: false,
			earlyStopBlocked: true,
			decisionReady: input.sampleMet,
			botShareBps: 0,
			controlSample: input.sampleMet ? 120 : 4,
			challengerSample: input.sampleMet ? 120 : 4,
			controlPrimaryCount: input.controlCount,
			challengerPrimaryCount: input.challengerCount,
			computedAt: new Date()
		})
		.returning();
	const [decision] = await db
		.insert(experimentDecisions)
		.values({
			organizationId: input.ctx.organizationId,
			clientId: input.ctx.clientId,
			experimentId: experiment.id,
			resultId: result.id,
			outcome: 'inconclusive',
			notes: 'Held for a design learning.'
		})
		.returning();
	await db.insert(experimentLearningObjects).values({
		organizationId: input.ctx.organizationId,
		clientId: input.ctx.clientId,
		experimentId: experiment.id,
		decisionId: decision.id,
		clientLabel: 'CE7 Northline House',
		industry: 'hospitality',
		audience: 'Buyers considering a stay',
		hypothesis: 'A clearer headline changes the lead count.',
		change: 'Challenger versus control on page versions',
		result: 'Stored experiment result',
		confidence: 'measured',
		conditions: {
			horizonMet: true,
			sampleMet: input.sampleMet,
			botContamination: false,
			sourceImbalance: false,
			controlSample: input.sampleMet ? 120 : 4,
			challengerSample: input.sampleMet ? 120 : 4,
			botShareBps: 0
		},
		decision: 'inconclusive',
		notes: 'Held for a design learning.'
	});
	if (input.controlPageVersionId && input.challengerPageVersionId) {
		await db.insert(experimentVariants).values([
			{
				organizationId: input.ctx.organizationId,
				clientId: input.ctx.clientId,
				experimentId: experiment.id,
				key: 'control',
				name: 'Current page',
				role: 'control',
				pageVersionId: input.controlPageVersionId
			},
			{
				organizationId: input.ctx.organizationId,
				clientId: input.ctx.clientId,
				experimentId: experiment.id,
				key: 'challenger',
				name: 'Alternate page',
				role: 'challenger',
				pageVersionId: input.challengerPageVersionId
			}
		]);
	}
	return experiment;
}
