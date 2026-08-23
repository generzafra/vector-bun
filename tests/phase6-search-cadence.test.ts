import { afterEach, beforeEach, expect, test } from 'bun:test';
import { resetRateLimits } from '@vector/auth';
import { MemoryTriggerClient, TriggerWorkflowRuntime } from '@vector/automation';
import { env } from '@vector/config';
import { ForbiddenError, TenantContextError, ValidationError } from '@vector/contracts';
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
	getSearchCadenceSettingsForTenant,
	listGeoObservationsForTenant,
	listSeoAuditsForTenant,
	searchCadenceSettings,
	searchWorkItems
} from '@vector/db';
import { eq } from 'drizzle-orm';
import {
	contextFor,
	getSearchOverview,
	listSearchPortfolioQueue,
	login,
	processPlatformDueSearchSweep,
	processSearchDueSweep,
	recordGeoObservation,
	refreshGeoQuerySet,
	resetWorkflowRuntime,
	resolveSession,
	setWorkflowRuntime,
	switchActiveClient,
	updateSearchCadence
} from '@vector/domain';
import { buildSearchDueItems, canRecordGeoCost, intervalDue } from '@vector/search';

const trigger = new MemoryTriggerClient();

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

async function resetCadenceRows(clientId: string) {
	await db.delete(searchWorkItems).where(eq(searchWorkItems.clientId, clientId));
	await db.delete(searchCadenceSettings).where(eq(searchCadenceSettings.clientId, clientId));
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

async function userAOn(ip: string) {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		ip
	);
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return actor;
}

beforeEach(async () => {
	resetRateLimits();
	const { alpha, beta } = await seededClients();
	await resetCadenceRows(alpha.id);
	await resetCadenceRows(beta.id);
	resetWorkflowRuntime();
	trigger.reset();
});

afterEach(async () => {
	const { alpha, beta } = await seededClients();
	await resetCadenceRows(alpha.id);
	await resetCadenceRows(beta.id);
	resetWorkflowRuntime();
});

test('cadence helpers refuse paid overspend and treat missing last-run as due', () => {
	expect(intervalDue(null, 7, new Date())).toBe(true);
	expect(
		canRecordGeoCost({
			paused: false,
			monthlyBudgetMinor: 0,
			spentMinor: 0,
			costMinor: 0
		}).allowed
	).toBe(true);
	expect(
		canRecordGeoCost({
			paused: false,
			monthlyBudgetMinor: 50,
			spentMinor: 40,
			costMinor: 20
		})
	).toEqual({
		allowed: false,
		reason: 'Monthly GEO measurement budget would be exceeded.'
	});
	expect(
		canRecordGeoCost({
			paused: true,
			monthlyBudgetMinor: 500,
			spentMinor: 0,
			costMinor: 0
		}).allowed
	).toBe(false);
	const items = buildSearchDueItems({
		now: new Date('2026-08-23T12:00:00.000Z'),
		settings: {
			technicalAuditIntervalDays: 7,
			propertySyncIntervalDays: 7,
			aeoRefreshIntervalDays: 7,
			geoSnapshotIntervalDays: 7,
			geoMeasureIntervalDays: 7,
			geoQueryLimit: 20,
			geoEngineLimit: 5,
			geoLocaleLimit: 2,
			monthlyBudgetMinor: 0,
			currency: 'USD',
			paused: false
		},
		lastTechnicalAuditAt: null,
		lastPropertySyncAt: null,
		hasProperty: false,
		lastAeoRefreshAt: null,
		lastGeoSnapshotAt: null,
		geoQueryCount: 0,
		lastGeoObservationAt: null,
		spentMinor: 0
	});
	expect(items.find((item) => item.kind === 'technical_audit')?.status).toBe('due');
	expect(items.find((item) => item.kind === 'property_sync')?.status).toBe('clear');
	expect(items.find((item) => item.kind === 'geo_measure')?.status).toBe('clear');
	expect(JSON.stringify(items)).not.toContain('geoScore');
});

test('cadence settings fail closed without TenantContext and stay tenant-scoped', async () => {
	await expect(
		getSearchCadenceSettingsForTenant({
			organizationId: '',
			clientId: '',
			roleIds: [],
			requestId: 'cadence-missing'
		})
	).rejects.toBeInstanceOf(TenantContextError);
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.8.1.1', 'cadence-iso-a');
	const betaActor = await adminOn(beta.id, '10.8.1.2', 'cadence-iso-b');
	const alphaCtx = contextFor(alphaActor, 'cadence-iso-a');
	const betaCtx = contextFor(betaActor, 'cadence-iso-b');
	await updateSearchCadence(
		alphaActor,
		alphaCtx,
		{
			technicalAuditIntervalDays: 14,
			propertySyncIntervalDays: 7,
			aeoRefreshIntervalDays: 7,
			geoSnapshotIntervalDays: 7,
			geoMeasureIntervalDays: 7,
			geoQueryLimit: 5,
			geoEngineLimit: 2,
			geoLocaleLimit: 1,
			monthlyBudgetMinor: 250,
			currency: 'USD',
			paused: false
		},
		'cadence-iso-a'
	);
	const alphaOverview = await getSearchOverview(alphaActor, alphaCtx);
	const betaOverview = await getSearchOverview(betaActor, betaCtx);
	expect(alphaOverview.cadence.settings.monthlyBudgetMinor).toBe(250);
	expect(alphaOverview.cadence.settings.geoQueryLimit).toBe(5);
	expect(betaOverview.cadence.settings.monthlyBudgetMinor).toBe(0);
	expect(betaOverview.cadence.settings.technicalAuditIntervalDays).toBe(7);
	expect(JSON.stringify(alphaOverview)).not.toContain(beta.id);
	expect(JSON.stringify(alphaOverview)).not.toContain('geoScore');
});

test('seo.manage is required to update cadence and seo.read is required to load it', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.8.1.3', 'cadence-cap');
	const ctx = contextFor(actor, 'cadence-cap');
	const reader = { ...actor, permissions: actor.permissions.filter((cap) => cap !== 'seo.manage') };
	const blind = { ...actor, permissions: actor.permissions.filter((cap) => cap !== 'seo.read') };
	await expect(
		updateSearchCadence(
			reader,
			ctx,
			{
				technicalAuditIntervalDays: 7,
				propertySyncIntervalDays: 7,
				aeoRefreshIntervalDays: 7,
				geoSnapshotIntervalDays: 7,
				geoMeasureIntervalDays: 7,
				geoQueryLimit: 20,
				geoEngineLimit: 5,
				geoLocaleLimit: 2,
				monthlyBudgetMinor: 0,
				currency: 'USD',
				paused: true
			},
			'cadence-cap'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(getSearchOverview(blind, ctx)).rejects.toBeInstanceOf(ForbiddenError);
	await expect(listSearchPortfolioQueue(blind, 'cadence-cap')).rejects.toBeInstanceOf(
		ForbiddenError
	);
});

test('pause and monthly budget fail closed for GEO recording', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.8.1.4', 'cadence-budget');
	const ctx = contextFor(actor, 'cadence-budget');
	await refreshGeoQuerySet(actor, ctx, 'cadence-budget-qs');
	const overview = await getSearchOverview(actor, ctx);
	const queryId = overview.geoQueries[0]?.id;
	expect(queryId).toBeTruthy();
	await updateSearchCadence(
		actor,
		ctx,
		{
			technicalAuditIntervalDays: 7,
			propertySyncIntervalDays: 7,
			aeoRefreshIntervalDays: 7,
			geoSnapshotIntervalDays: 7,
			geoMeasureIntervalDays: 7,
			geoQueryLimit: 20,
			geoEngineLimit: 1,
			geoLocaleLimit: 2,
			monthlyBudgetMinor: 50,
			currency: 'USD',
			paused: false
		},
		'cadence-budget'
	);
	await recordGeoObservation(
		actor,
		ctx,
		{
			queryId,
			engine: 'chatgpt',
			method: 'manual',
			mentioned: true,
			ownedCitation: false,
			earnedCitation: false,
			represented: false,
			costMinor: 40,
			currency: 'USD'
		},
		'cadence-budget-1'
	);
	await expect(
		recordGeoObservation(
			actor,
			ctx,
			{
				queryId,
				engine: 'chatgpt',
				method: 'manual',
				mentioned: false,
				ownedCitation: false,
				earnedCitation: false,
				represented: false,
				costMinor: 20,
				currency: 'USD'
			},
			'cadence-budget-2'
		)
	).rejects.toBeInstanceOf(ValidationError);
	await expect(
		recordGeoObservation(
			actor,
			ctx,
			{
				queryId,
				engine: 'gemini',
				method: 'manual',
				mentioned: false,
				ownedCitation: false,
				earnedCitation: false,
				represented: false,
				costMinor: 0,
				currency: 'USD'
			},
			'cadence-budget-engine'
		)
	).rejects.toBeInstanceOf(ValidationError);
	await recordGeoObservation(
		actor,
		ctx,
		{
			queryId,
			engine: 'chatgpt',
			method: 'manual',
			mentioned: false,
			ownedCitation: false,
			earnedCitation: false,
			represented: false,
			costMinor: 0,
			currency: 'USD'
		},
		'cadence-budget-free'
	);
	await updateSearchCadence(
		actor,
		ctx,
		{
			technicalAuditIntervalDays: 7,
			propertySyncIntervalDays: 7,
			aeoRefreshIntervalDays: 7,
			geoSnapshotIntervalDays: 7,
			geoMeasureIntervalDays: 7,
			geoQueryLimit: 20,
			geoEngineLimit: 5,
			geoLocaleLimit: 2,
			monthlyBudgetMinor: 500,
			currency: 'USD',
			paused: true
		},
		'cadence-pause'
	);
	await expect(
		recordGeoObservation(
			actor,
			ctx,
			{
				queryId,
				engine: 'other',
				method: 'manual',
				mentioned: false,
				ownedCitation: false,
				earnedCitation: false,
				represented: false,
				costMinor: 0,
				currency: 'USD'
			},
			'cadence-paused-record'
		)
	).rejects.toBeInstanceOf(ValidationError);
});

test('tenant sweep runs automated search work and never records a GEO observation', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.8.1.5', 'cadence-sweep-a');
	const betaActor = await adminOn(beta.id, '10.8.1.6', 'cadence-sweep-b');
	const alphaCtx = contextFor(alphaActor, 'cadence-sweep-a');
	const betaCtx = contextFor(betaActor, 'cadence-sweep-b');
	await getSearchOverview(alphaActor, alphaCtx);
	const stale = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	await db
		.update(searchCadenceSettings)
		.set({
			lastTechnicalAuditAt: stale,
			lastAeoRefreshAt: stale,
			lastGeoSnapshotAt: stale,
			updatedAt: new Date()
		})
		.where(eq(searchCadenceSettings.clientId, alpha.id));
	const betaAuditsBefore = (await listSeoAuditsForTenant(betaCtx)).length;
	const alphaObservationsBefore = (await listGeoObservationsForTenant(alphaCtx)).length;
	const result = await processSearchDueSweep(alphaCtx);
	expect(result.skipped).toBe(false);
	expect(result.ran).toContain('technical_audit');
	expect(result.ran).toContain('aeo_refresh');
	expect(result.ran).not.toContain('geo_measure');
	expect((await listSeoAuditsForTenant(alphaCtx)).length).toBeGreaterThan(0);
	expect((await listSeoAuditsForTenant(betaCtx)).length).toBe(betaAuditsBefore);
	expect((await listGeoObservationsForTenant(alphaCtx)).length).toBe(alphaObservationsBefore);
	const after = await getSearchOverview(alphaActor, alphaCtx);
	expect(after.cadence.queue.find((item) => item.kind === 'technical_audit')?.status).toBe('clear');
	await updateSearchCadence(
		alphaActor,
		alphaCtx,
		{
			technicalAuditIntervalDays: 7,
			propertySyncIntervalDays: 7,
			aeoRefreshIntervalDays: 7,
			geoSnapshotIntervalDays: 7,
			geoMeasureIntervalDays: 7,
			geoQueryLimit: 20,
			geoEngineLimit: 5,
			geoLocaleLimit: 2,
			monthlyBudgetMinor: 0,
			currency: 'USD',
			paused: true
		},
		'cadence-sweep-pause'
	);
	const paused = await processSearchDueSweep(alphaCtx);
	expect(paused.skipped).toBe(true);
	expect(paused.ran).toEqual([]);
});

test('platform search sweep fans out one tenant job and does not attach Beta to Alpha', async () => {
	const { alpha, beta } = await seededClients();
	setWorkflowRuntime(new TriggerWorkflowRuntime(trigger));
	const result = await processPlatformDueSearchSweep({ requestId: 'cadence-platform' });
	expect(result.tenants).toBeGreaterThanOrEqual(2);
	const alphaJobs = trigger.calls.filter(
		(call) =>
			call.name === 'search-due-sweep' &&
			typeof call.payload === 'object' &&
			call.payload !== null &&
			'clientId' in call.payload &&
			call.payload.clientId === alpha.id
	);
	expect(alphaJobs).toHaveLength(1);
	expect(alphaJobs[0]?.payload).toMatchObject({
		organizationId: alpha.organizationId,
		clientId: alpha.id
	});
	expect(JSON.stringify(alphaJobs[0]?.payload)).not.toContain(beta.id);
});

test('portfolio queue is capability-gated and Alpha-scoped actors cannot see Beta', async () => {
	const { alpha, beta } = await seededClients();
	const cadence = {
		technicalAuditIntervalDays: 7,
		propertySyncIntervalDays: 7,
		aeoRefreshIntervalDays: 7,
		geoSnapshotIntervalDays: 7,
		geoMeasureIntervalDays: 7,
		geoQueryLimit: 20,
		geoEngineLimit: 5,
		geoLocaleLimit: 2,
		monthlyBudgetMinor: 0,
		currency: 'USD',
		paused: true
	};
	const admin = await adminOn(alpha.id, '10.8.1.7', 'cadence-port-admin');
	await updateSearchCadence(
		admin,
		contextFor(admin, 'cadence-port-admin'),
		cadence,
		'cadence-port-a'
	);
	const betaActor = await adminOn(beta.id, '10.8.1.8', 'cadence-port-beta');
	await updateSearchCadence(
		betaActor,
		contextFor(betaActor, 'cadence-port-beta'),
		cadence,
		'cadence-port-b'
	);
	const adminQueue = await listSearchPortfolioQueue(admin, 'cadence-port-admin');
	expect(adminQueue.some((row) => row.clientId === alpha.id)).toBe(true);
	expect(adminQueue.some((row) => row.clientId === beta.id)).toBe(true);
	const userA = await userAOn('10.8.1.9');
	const scoped = await listSearchPortfolioQueue(userA, 'cadence-port-user');
	expect(scoped.some((row) => row.clientId === alpha.id)).toBe(true);
	expect(scoped.some((row) => row.clientId === beta.id)).toBe(false);
	expect(JSON.stringify(scoped)).not.toContain(beta.id);
});
