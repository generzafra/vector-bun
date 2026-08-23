import { afterEach, beforeEach, expect, test } from 'bun:test';
import { resetRateLimits } from '@vector/auth';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { ForbiddenError, TenantContextError, requireTenantContext } from '@vector/contracts';
import {
	answerTargets,
	claims,
	clients,
	contentBriefs,
	db,
	insertClaimForTenant,
	listAnswerTargetsForTenant,
	listContentBriefsForTenant,
	listSchemaEntitiesForTenant,
	pages,
	schemaEntities,
	seoOpportunities
} from '@vector/db';
import {
	contextFor,
	getSearchOverview,
	login,
	refreshAnswerReadiness,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import {
	coverAnswerTarget,
	faqCoversTarget,
	proposeAnswerTargets,
	proposeSchemaEntities
} from '@vector/search';
import { app } from '../apps/api/src/app';

const brand = {
	id: '11111111-1111-4111-8111-111111111111',
	displayName: 'North Clinic',
	tagline: 'Written treatment plans',
	offer: 'Consult first'
};

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

async function resetAeoRows(clientId: string) {
	await db.delete(seoOpportunities).where(eq(seoOpportunities.clientId, clientId));
	await db.delete(contentBriefs).where(eq(contentBriefs.clientId, clientId));
	await db.delete(answerTargets).where(eq(answerTargets.clientId, clientId));
	await db.delete(schemaEntities).where(eq(schemaEntities.clientId, clientId));
	await db.delete(claims).where(eq(claims.statement, 'Evening consults are available on Tuesdays'));
}

async function adminOn(clientId: string, ip: string, requestId: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	await switchActiveClient(session, session.token, clientId, `${requestId}-switch`);
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return actor;
}

beforeEach(async () => {
	resetRateLimits();
	const { alpha, beta } = await seededClients();
	await resetAeoRows(alpha.id);
	await resetAeoRows(beta.id);
});

afterEach(async () => {
	const { alpha, beta } = await seededClients();
	await resetAeoRows(alpha.id);
	await resetAeoRows(beta.id);
});

test('schema entities and answer targets stay grounded in approved knowledge', () => {
	const knowledge = {
		brand,
		services: [
			{
				id: '22222222-2222-4222-8222-222222222222',
				name: 'Consult plan',
				outcome: 'A written plan',
				summary: 'after the first visit'
			}
		],
		offers: [
			{
				id: '33333333-3333-4333-8333-333333333333',
				name: 'New patient consult',
				summary: 'Includes a written plan'
			}
		],
		claims: [
			{
				id: '44444444-4444-4444-8444-444444444444',
				kind: 'approved' as const,
				statement: 'Consults include a written treatment plan',
				evidence: 'Clinic protocol 2026'
			},
			{
				id: '55555555-5555-4555-8555-555555555555',
				kind: 'prohibited' as const,
				statement: 'Guaranteed implant success',
				evidence: null
			}
		]
	};
	const entities = proposeSchemaEntities(knowledge);
	expect(entities.some((row) => row.kind === 'organization' && row.name === 'North Clinic')).toBe(
		true
	);
	expect(entities.some((row) => row.fact.includes('Guaranteed implant success'))).toBe(false);
	const targets = proposeAnswerTargets(knowledge);
	expect(targets.some((row) => row.question === 'What outcome does Consult plan produce?')).toBe(
		true
	);
	expect(targets.some((row) => row.answer.includes('Guaranteed implant success'))).toBe(false);
	expect(targets.filter((row) => row.sourceKind === 'knowledge_claim')).toHaveLength(1);
});

test('FAQ coverage maps existing answers and leaves unmatched facts as gaps', () => {
	const target = {
		sourceKind: 'knowledge_claim' as const,
		sourceId: '44444444-4444-4444-8444-444444444444',
		intent: 'definition' as const,
		question: 'What can we confirm today?',
		answer: 'Consults include a written treatment plan (Clinic protocol 2026)'
	};
	expect(
		faqCoversTarget(target, {
			question: 'What can we confirm today?',
			answer: 'Consults include a written treatment plan (Clinic protocol 2026)'
		})
	).toBe(true);
	expect(
		coverAnswerTarget(target, [
			{
				pageId: '66666666-6666-4666-8666-666666666666',
				path: '/',
				question: 'Unrelated question',
				answer: 'Unrelated answer'
			}
		]).status
	).toBe('gap');
});

test('missing TenantContext cannot list answer-readiness rows', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listSchemaEntitiesForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listAnswerTargetsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listContentBriefsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('Alpha cannot read Beta entities or answer targets', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.6.3.1', 'aeo-iso-a');
	const betaActor = await adminOn(beta.id, '10.6.3.2', 'aeo-iso-b');
	await refreshAnswerReadiness(alphaActor, contextFor(alphaActor, 'aeo-iso-a'), 'aeo-iso-a');
	await refreshAnswerReadiness(betaActor, contextFor(betaActor, 'aeo-iso-b'), 'aeo-iso-b');

	const alphaOverview = await getSearchOverview(alphaActor, contextFor(alphaActor, 'aeo-iso-a'));
	const betaOverview = await getSearchOverview(betaActor, contextFor(betaActor, 'aeo-iso-b'));
	expect(alphaOverview.entities.length).toBeGreaterThan(0);
	expect(betaOverview.entities.length).toBeGreaterThan(0);
	const alphaNames = alphaOverview.entities.map((row) => row.name).join(' ');
	const betaNames = betaOverview.entities.map((row) => row.name).join(' ');
	expect(alphaNames).not.toBe(betaNames);
	expect(
		alphaOverview.entities.some((row) => betaOverview.entities.some((other) => other.id === row.id))
	).toBe(false);
	await expect(
		getSearchOverview(alphaActor, contextFor(alphaActor, 'aeo-iso-a'), beta.id)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('seeded FAQs map and extra approved claims become source-backed gaps without a new page', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.3.3', 'aeo-gap');
	const ctx = contextFor(actor, 'aeo-gap');
	const pagesBefore = await db
		.select({ id: pages.id })
		.from(pages)
		.where(eq(pages.clientId, alpha.id));

	const first = await refreshAnswerReadiness(actor, ctx, 'aeo-gap-1');
	expect(first.summary.mapped).toBeGreaterThan(0);
	expect(
		first.answerTargets.some((row) => row.sourceKind === 'service' && row.status === 'mapped')
	).toBe(true);
	expect(
		first.entities.some((row) => row.kind === 'organization' && row.status === 'current')
	).toBe(true);

	const extra = await insertClaimForTenant(ctx, {
		kind: 'approved',
		statement: 'Evening consults are available on Tuesdays',
		evidence: 'Desk calendar 2026'
	});
	const second = await refreshAnswerReadiness(actor, ctx, 'aeo-gap-2');
	const gap = second.answerTargets.find((row) => row.sourceId === extra.id);
	expect(gap?.status).toBe('gap');
	expect(second.briefs.some((row) => row.claimId === extra.id)).toBe(true);
	expect(
		second.opportunities.some(
			(row) =>
				row.sourceKind === 'knowledge_claim' && row.sourceId === extra.id && row.channel === 'aeo'
		)
	).toBe(true);
	expect(JSON.stringify(second).includes('Guaranteed implant success')).toBe(false);

	const pagesAfter = await db
		.select({ id: pages.id })
		.from(pages)
		.where(eq(pages.clientId, alpha.id));
	expect(pagesAfter.map((row) => row.id).sort()).toEqual(pagesBefore.map((row) => row.id).sort());
});

test('seo.manage is required to refresh answer readiness', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.3.4', 'aeo-cap');
	const ctx = contextFor(actor, 'aeo-cap');
	const reader = { ...actor, permissions: actor.permissions.filter((cap) => cap !== 'seo.manage') };
	await expect(refreshAnswerReadiness(reader, ctx, 'aeo-cap')).rejects.toBeInstanceOf(
		ForbiddenError
	);

	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request('/v1/search/answer-readiness', {
		method: 'POST',
		headers: { cookie, 'content-type': 'application/json' },
		body: '{}'
	});
	expect(res.status).toBeGreaterThanOrEqual(400);
});
