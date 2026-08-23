import { afterEach, beforeEach, expect, test } from 'bun:test';
import { resetRateLimits } from '@vector/auth';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	GEO_QUERY_LIMIT,
	NotFoundError,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	db,
	geoCitations,
	geoEngineObservations,
	geoFactRepresentations,
	geoMeasurementRuns,
	geoQueries,
	geoQuerySets,
	geoReferralEvents,
	geoVisibilitySnapshots,
	listGeoFactRepresentationsForTenant,
	listGeoObservationsForTenant,
	listGeoQueriesForTenant,
	listGeoQuerySetsForTenant,
	listGeoVisibilitySnapshotsForTenant
} from '@vector/db';
import {
	contextFor,
	getSearchOverview,
	login,
	recordGeoObservation,
	refreshGeoQuerySet,
	resetDomainSearchProvider,
	resolveSession,
	setDomainSearchProvider,
	switchActiveClient
} from '@vector/domain';
import {
	GoogleSearchProvider,
	assertGeoObservationIntegrity,
	geoObservationIsStale,
	mentionIsNotCitation,
	proposeGeoQueries
} from '@vector/search';
import { app } from '../apps/api/src/app';

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

async function resetGeoRows(clientId: string) {
	await db.delete(geoReferralEvents).where(eq(geoReferralEvents.clientId, clientId));
	await db.delete(geoFactRepresentations).where(eq(geoFactRepresentations.clientId, clientId));
	await db.delete(geoVisibilitySnapshots).where(eq(geoVisibilitySnapshots.clientId, clientId));
	await db.delete(geoCitations).where(eq(geoCitations.clientId, clientId));
	await db.delete(geoEngineObservations).where(eq(geoEngineObservations.clientId, clientId));
	await db.delete(geoMeasurementRuns).where(eq(geoMeasurementRuns.clientId, clientId));
	await db.delete(geoQueries).where(eq(geoQueries.clientId, clientId));
	await db.delete(geoQuerySets).where(eq(geoQuerySets.clientId, clientId));
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
	await resetGeoRows(alpha.id);
	await resetGeoRows(beta.id);
});

afterEach(async () => {
	const { alpha, beta } = await seededClients();
	await resetGeoRows(alpha.id);
	await resetGeoRows(beta.id);
	resetDomainSearchProvider();
});

test('GEO query sets stay small, commercial, and free of prohibited claims', () => {
	const brandId = '11111111-1111-4111-8111-111111111111';
	const queries = proposeGeoQueries({
		brand: { id: brandId, displayName: 'North Clinic', primaryConversion: 'book a consult' },
		services: Array.from({ length: 30 }, (_, index) => ({
			id: `22222222-2222-4222-8222-${String(index).padStart(12, '0')}`,
			name: `Service ${index}`
		})),
		offers: [{ id: '33333333-3333-4333-8333-333333333333', name: 'New patient consult' }],
		claims: [{ kind: 'prohibited', statement: 'Guaranteed implant success' }]
	});
	expect(queries.length).toBeLessThanOrEqual(GEO_QUERY_LIMIT);
	expect(queries.some((row) => row.group === 'brand' && row.query === 'North Clinic')).toBe(true);
	expect(queries.some((row) => row.query.includes('Guaranteed implant success'))).toBe(false);
	expect(queries.some((row) => /best |reviews/i.test(row.query))).toBe(false);
});

test('mention is not a citation and stale observations are not current', () => {
	expect(
		mentionIsNotCitation({ mentioned: true, ownedCitation: false, earnedCitation: false })
	).toBe(true);
	expect(
		mentionIsNotCitation({ mentioned: true, ownedCitation: true, earnedCitation: false })
	).toBe(false);
	expect(
		geoObservationIsStale(
			new Date('2026-01-01T00:00:00.000Z'),
			new Date('2026-08-23T00:00:00.000Z')
		)
	).toBe(true);
	expect(() =>
		assertGeoObservationIntegrity({
			method: 'manual',
			mentioned: false,
			ownedCitation: true,
			earnedCitation: false,
			represented: false,
			citations: [{ kind: 'owned', url: 'https://www.client.example/' }]
		})
	).toThrow(ValidationError);
	expect(() =>
		assertGeoObservationIntegrity({
			method: 'manual',
			mentioned: true,
			ownedCitation: false,
			earnedCitation: false,
			represented: false,
			retainedAnswer: 'A full model answer',
			citations: []
		})
	).toThrow(ValidationError);
});

test('missing TenantContext cannot list GEO rows', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listGeoQuerySetsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listGeoQueriesForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listGeoObservationsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listGeoVisibilitySnapshotsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	expect(listGeoFactRepresentationsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('Alpha cannot read Beta GEO query sets or observations', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.6.4.1', 'geo-iso-a');
	const betaActor = await adminOn(beta.id, '10.6.4.2', 'geo-iso-b');
	await refreshGeoQuerySet(alphaActor, contextFor(alphaActor, 'geo-iso-a'), 'geo-iso-a');
	await refreshGeoQuerySet(betaActor, contextFor(betaActor, 'geo-iso-b'), 'geo-iso-b');
	const alphaOverview = await getSearchOverview(alphaActor, contextFor(alphaActor, 'geo-iso-a'));
	const betaOverview = await getSearchOverview(betaActor, contextFor(betaActor, 'geo-iso-b'));
	expect(alphaOverview.geoQueries.length).toBeGreaterThan(0);
	expect(betaOverview.geoQueries.length).toBeGreaterThan(0);
	expect(
		alphaOverview.geoQueries.some((row) =>
			betaOverview.geoQueries.some((other) => other.id === row.id)
		)
	).toBe(false);
	expect(JSON.stringify(alphaOverview)).not.toMatch(/geoScore|AI rank|ai rank/i);
	expect(alphaOverview.generativeMeasurement.supported).toBe(false);
	expect(alphaOverview.generativeMeasurement.manualSupported).toBe(true);
	expect(alphaOverview.generativeMeasurement.liveSupported).toBe(false);
	expect(alphaOverview.geoReport.status).toBe('empty');
	expect(alphaOverview.geoReport.current).toBe(false);
	expect(alphaOverview.geoReport.snapshotId).toBeNull();
	await expect(
		getSearchOverview(alphaActor, contextFor(alphaActor, 'geo-iso-a'), beta.id)
	).rejects.toBeInstanceOf(TenantContextError);
	const betaQuery = betaOverview.geoQueries[0];
	if (!betaQuery) throw new Error('expected a Beta GEO query');
	await expect(
		recordGeoObservation(
			alphaActor,
			contextFor(alphaActor, 'geo-iso-a'),
			{
				queryId: betaQuery.id,
				engine: 'other',
				method: 'manual',
				mentioned: true,
				ownedCitation: false,
				earnedCitation: false,
				represented: false
			},
			'geo-iso-cross'
		)
	).rejects.toBeInstanceOf(NotFoundError);
});

test('manual observations persist mention without treating it as a citation or live measurement', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.4.3', 'geo-obs');
	const ctx = contextFor(actor, 'geo-obs');
	const refreshed = await refreshGeoQuerySet(actor, ctx, 'geo-obs-set');
	const query = refreshed.queries[0];
	if (!query) throw new Error('expected a GEO query');
	const recorded = await recordGeoObservation(
		actor,
		ctx,
		{
			queryId: query.id,
			engine: 'other',
			method: 'manual',
			mentioned: true,
			ownedCitation: false,
			earnedCitation: false,
			represented: false,
			accurate: 'unknown',
			prominence: 'mentioned',
			detail: 'Operator saw a brand mention only'
		},
		'geo-obs-record'
	);
	expect(recorded.observation.mentioned).toBe(true);
	expect(recorded.observation.mentionOnly).toBe(true);
	expect(recorded.observation.ownedCitation).toBe(false);
	expect(recorded.generativeMeasurement.supported).toBe(true);
	if (recorded.generativeMeasurement.supported) {
		expect(recorded.generativeMeasurement.adapter).toBe('manual');
		expect(recorded.generativeMeasurement.method).toBe('manual');
	}
	expect(recorded.observation.stale).toBe(false);
	const calls: string[] = [];
	setDomainSearchProvider(
		'google',
		new GoogleSearchProvider(async (input) => {
			calls.push(String(input));
			return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
		})
	);
	const official = await recordGeoObservation(
		actor,
		ctx,
		{
			queryId: query.id,
			engine: 'chatgpt',
			method: 'operator_assisted',
			mentioned: true,
			ownedCitation: false,
			earnedCitation: false,
			represented: false,
			detail: 'Official adapter still records manually'
		},
		'geo-obs-official'
	);
	expect(official.generativeMeasurement.supported).toBe(true);
	expect(calls).toEqual([]);
	await expect(
		recordGeoObservation(
			actor,
			ctx,
			{
				queryId: query.id,
				engine: 'other',
				method: 'manual',
				mentioned: true,
				ownedCitation: true,
				earnedCitation: false,
				represented: false,
				citations: []
			},
			'geo-obs-bad'
		)
	).rejects.toBeInstanceOf(ValidationError);
});

test('seo.manage is required to refresh GEO queries', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.4.4', 'geo-cap');
	const ctx = contextFor(actor, 'geo-cap');
	const reader = { ...actor, permissions: actor.permissions.filter((cap) => cap !== 'seo.manage') };
	await expect(refreshGeoQuerySet(reader, ctx, 'geo-cap')).rejects.toBeInstanceOf(ForbiddenError);
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request('/v1/search/geo/query-set', {
		method: 'POST',
		headers: { cookie, 'content-type': 'application/json' },
		body: '{}'
	});
	expect(res.status).toBeGreaterThanOrEqual(400);
});
