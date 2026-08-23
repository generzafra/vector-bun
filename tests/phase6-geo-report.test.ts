import { afterEach, beforeEach, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { ForbiddenError, TenantContextError } from '@vector/contracts';
import {
	claims,
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
	deleteClaimForTenant,
	insertClaimForTenant,
	insertGeoVisibilitySnapshotForTenant,
	listGeoFactRepresentationsForTenant,
	listGeoVisibilitySnapshotsForTenant
} from '@vector/db';
import {
	contextFor,
	getSearchOverview,
	login,
	recordGeoObservation,
	refreshGeoQuerySet,
	refreshGeoVisibilitySnapshot,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import {
	GEO_SNAPSHOT_MIN_OBSERVATIONS,
	buildGeoVisibilitySnapshot,
	geoVisibilityHeadline,
	matchApprovedClaim,
	publicGeoReportFreshness
} from '@vector/search';

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
	await db
		.delete(claims)
		.where(
			and(
				eq(claims.clientId, clientId),
				eq(claims.statement, 'Evening consults are available on Tuesdays')
			)
		);
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
	const { alpha, beta } = await seededClients();
	await resetGeoRows(alpha.id);
	await resetGeoRows(beta.id);
});

afterEach(async () => {
	const { alpha, beta } = await seededClients();
	await resetGeoRows(alpha.id);
	await resetGeoRows(beta.id);
});

test('one observation is not a current visibility pattern', () => {
	expect(GEO_SNAPSHOT_MIN_OBSERVATIONS).toBe(2);
	const now = new Date('2026-08-23T00:00:00.000Z');
	const draft = buildGeoVisibilitySnapshot({
		queries: [{ id: '11111111-1111-4111-8111-111111111111' }],
		observations: [
			{
				id: '22222222-2222-4222-8222-222222222222',
				queryId: '11111111-1111-4111-8111-111111111111',
				mentioned: true,
				ownedCitation: false,
				earnedCitation: false,
				represented: false,
				accurate: 'unknown',
				observedAt: now,
				detail: 'Mention only'
			}
		],
		claims: [],
		now
	});
	expect(draft.sufficient).toBe(false);
	expect(draft.status).toBe('insufficient');
	expect(draft.headline).toContain('One observation is not a visibility pattern');
	expect(draft.representations[0]?.status).toBe('missing');
});

test('repeated observations can describe mentions without becoming a ranking', () => {
	const now = new Date('2026-08-23T00:00:00.000Z');
	const queryId = '11111111-1111-4111-8111-111111111111';
	const draft = buildGeoVisibilitySnapshot({
		queries: [{ id: queryId }, { id: '33333333-3333-4333-8333-333333333333' }],
		observations: [
			{
				id: '22222222-2222-4222-8222-222222222221',
				queryId,
				mentioned: true,
				ownedCitation: false,
				earnedCitation: false,
				represented: false,
				accurate: 'unknown',
				observedAt: now
			},
			{
				id: '22222222-2222-4222-8222-222222222222',
				queryId,
				mentioned: true,
				ownedCitation: false,
				earnedCitation: false,
				represented: false,
				accurate: 'unknown',
				observedAt: now
			}
		],
		claims: [],
		now
	});
	expect(draft.sufficient).toBe(true);
	expect(draft.mentionedQueryCount).toBe(1);
	expect(draft.mentionOnlyCount).toBe(2);
	expect(draft.headline).toContain(
		'Vector observed your company in 1 of 2 monitored AI discovery queries'
	);
	expect(draft.headline).toContain('Those records were mentions, not citations');
	expect(draft.headline).not.toMatch(/geoScore|AI rank|ai rank/i);
});

test('approved claims can ground accuracy and prohibited claims cannot', () => {
	const claim = {
		id: '44444444-4444-4444-8444-444444444444',
		kind: 'approved',
		statement: 'Evening consults are available on Tuesdays'
	};
	expect(matchApprovedClaim(claim.statement, [claim])?.id).toBe(claim.id);
	expect(
		matchApprovedClaim(claim.statement, [
			{ id: '55555555-5555-4555-8555-555555555555', kind: 'prohibited', statement: claim.statement }
		])
	).toBeNull();
	const now = new Date('2026-08-23T00:00:00.000Z');
	const draft = buildGeoVisibilitySnapshot({
		queries: [{ id: '11111111-1111-4111-8111-111111111111' }],
		observations: [
			{
				id: '22222222-2222-4222-8222-222222222222',
				queryId: '11111111-1111-4111-8111-111111111111',
				mentioned: true,
				ownedCitation: false,
				earnedCitation: false,
				represented: true,
				accurate: 'no',
				observedAt: now,
				detail: 'Evening consults are available on Tuesdays'
			},
			{
				id: '22222222-2222-4222-8222-222222222223',
				queryId: '11111111-1111-4111-8111-111111111111',
				mentioned: true,
				ownedCitation: false,
				earnedCitation: false,
				represented: true,
				accurate: 'yes',
				observedAt: now,
				detail: 'Evening consults are available on Tuesdays'
			}
		],
		claims: [claim],
		now
	});
	expect(
		draft.representations.some((row) => row.status === 'inaccurate' && row.claimId === claim.id)
	).toBe(true);
	expect(
		draft.representations.some(
			(row) => row.status === 'accurate' && row.evidenceClass === 'source_verified'
		)
	).toBe(true);
	expect(draft.accurateNoCount).toBe(1);
	expect(draft.headline).toContain('did not match approved facts');
});

test('stale snapshots are not current', () => {
	const stale = publicGeoReportFreshness(
		new Date('2026-01-01T00:00:00.000Z'),
		new Date('2026-08-23T00:00:00.000Z')
	);
	expect(stale.stale).toBe(true);
	expect(stale.current).toBe(false);
	const headline = geoVisibilityHeadline({
		monitoredQueries: 4,
		mentionedQueries: 2,
		observationCount: 3,
		mentionOnlyCount: 1,
		accurateNoCount: 0,
		sufficient: true,
		stale: true
	});
	expect(headline.status).toBe('stale');
	expect(headline.current).toBe(false);
	expect(headline.headline).toContain('is not current');
});

test('Alpha cannot read Beta snapshots or fact representations', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.6.6.1', 'geo-rep-iso-a');
	const betaActor = await adminOn(beta.id, '10.6.6.2', 'geo-rep-iso-b');
	const alphaCtx = contextFor(alphaActor, 'geo-rep-iso-a');
	const betaCtx = contextFor(betaActor, 'geo-rep-iso-b');
	const alphaSet = await refreshGeoQuerySet(alphaActor, alphaCtx, 'geo-rep-iso-a');
	const betaSet = await refreshGeoQuerySet(betaActor, betaCtx, 'geo-rep-iso-b');
	const alphaQuery = alphaSet.queries[0];
	const betaQuery = betaSet.queries[0];
	if (!alphaQuery || !betaQuery) throw new Error('expected GEO queries');
	await recordGeoObservation(
		alphaActor,
		alphaCtx,
		{
			queryId: alphaQuery.id,
			engine: 'other',
			method: 'manual',
			mentioned: true,
			ownedCitation: false,
			earnedCitation: false,
			represented: false
		},
		'geo-rep-iso-a-1'
	);
	await recordGeoObservation(
		betaActor,
		betaCtx,
		{
			queryId: betaQuery.id,
			engine: 'other',
			method: 'manual',
			mentioned: true,
			ownedCitation: false,
			earnedCitation: false,
			represented: false
		},
		'geo-rep-iso-b-1'
	);
	const alphaOverview = await getSearchOverview(alphaActor, alphaCtx);
	const betaOverview = await getSearchOverview(betaActor, betaCtx);
	expect(alphaOverview.geoReport.snapshotId).toBeTruthy();
	expect(betaOverview.geoReport.snapshotId).toBeTruthy();
	expect(alphaOverview.geoReport.snapshotId).not.toBe(betaOverview.geoReport.snapshotId);
	expect(JSON.stringify(alphaOverview)).not.toMatch(/geoScore|AI rank|ai rank/i);
	await expect(getSearchOverview(alphaActor, alphaCtx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('recorded observations persist an insufficient snapshot then a current report', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.6.3', 'geo-rep');
	const ctx = contextFor(actor, 'geo-rep');
	const refreshed = await refreshGeoQuerySet(actor, ctx, 'geo-rep-set');
	const query = refreshed.queries[0];
	if (!query) throw new Error('expected a GEO query');
	const first = await recordGeoObservation(
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
			detail: 'Operator saw a brand mention only'
		},
		'geo-rep-1'
	);
	expect(first.geoReport.status).toBe('insufficient');
	expect(first.geoReport.current).toBe(false);
	expect(first.geoReport.sufficient).toBe(false);
	const claim = await insertClaimForTenant(ctx, {
		kind: 'approved',
		statement: 'Evening consults are available on Tuesdays'
	});
	try {
		const second = await recordGeoObservation(
			actor,
			ctx,
			{
				queryId: query.id,
				engine: 'other',
				method: 'manual',
				mentioned: true,
				ownedCitation: false,
				earnedCitation: false,
				represented: true,
				accurate: 'yes',
				detail: 'Evening consults are available on Tuesdays'
			},
			'geo-rep-2'
		);
		expect(second.geoReport.status).toBe('recorded');
		expect(second.geoReport.current).toBe(true);
		expect(second.geoReport.headline).toContain('Vector observed your company in');
		expect(second.geoReport.representations.some((row) => row.claimId === claim.id)).toBe(true);
		expect(second.geoReport.representations.some((row) => row.status === 'accurate')).toBe(true);
		const overview = await getSearchOverview(actor, ctx);
		expect(overview.geoReport.status).toBe('recorded');
		expect(overview.geoReport.stale).toBe(false);
	} finally {
		await resetGeoRows(alpha.id);
		await deleteClaimForTenant(ctx, claim.id);
	}
});

test('stale persisted snapshots are not shown as current', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.6.4', 'geo-rep-stale');
	const ctx = contextFor(actor, 'geo-rep-stale');
	const refreshed = await refreshGeoQuerySet(actor, ctx, 'geo-rep-stale-set');
	const computedAt = new Date('2026-01-01T00:00:00.000Z');
	await insertGeoVisibilitySnapshotForTenant(ctx, {
		setId: refreshed.set.id,
		windowStart: computedAt,
		windowEnd: computedAt,
		computedAt,
		queryCount: 4,
		observationCount: 3,
		mentionedQueryCount: 2,
		ownedCitationQueryCount: 0,
		earnedCitationQueryCount: 0,
		representedQueryCount: 0,
		accurateYesCount: 0,
		accurateNoCount: 0,
		mentionOnlyCount: 3,
		sufficient: true,
		headline:
			'Vector observed your company in 2 of 4 monitored AI discovery queries in this snapshot.'
	});
	const overview = await getSearchOverview(actor, ctx);
	expect(overview.geoReport.status).toBe('stale');
	expect(overview.geoReport.current).toBe(false);
	expect(overview.geoReport.stale).toBe(true);
	expect(overview.geoReport.headline).toContain('is not current');
});

test('seo.manage is required to refresh a visibility snapshot', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.6.5', 'geo-rep-cap');
	const ctx = contextFor(actor, 'geo-rep-cap');
	const reader = { ...actor, permissions: actor.permissions.filter((cap) => cap !== 'seo.manage') };
	await expect(refreshGeoVisibilitySnapshot(reader, ctx, 'geo-rep-cap')).rejects.toBeInstanceOf(
		ForbiddenError
	);
	await expect(listGeoVisibilitySnapshotsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(listGeoFactRepresentationsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
});
