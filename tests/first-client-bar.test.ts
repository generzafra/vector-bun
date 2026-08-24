import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	NotFoundError,
	TenantContextError,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	db,
	getLatestLogoAssetForTenant,
	listClientGoalsForTenant,
	listNotificationPreferencesForTenant,
	upsertFirstRevealGateForTenant
} from '@vector/db';
import {
	composeFunnel,
	contextFor,
	getClientOutcomes,
	getDeliveryBrandLogoBytes,
	getFunnel,
	hasBrandLogoForTenant,
	login,
	overrideFirstRevealGate,
	resolveDeliveryPage,
	resolveSession,
	switchActiveClient,
	updateNotificationPreference,
	uploadBrandAsset,
	upsertClientGoal
} from '@vector/domain';
import { composeLeadPage, evaluateFirstRevealGate, previewHostname } from '@vector/funnel-engine';
import { app } from '../apps/api/src/app';

const PNG_1X1 = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82
]);

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

async function adminOn(clientId: string, ip: string, requestId: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	await switchActiveClient(session, session.token, clientId, requestId);
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return actor;
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

const premiumKnowledge = {
	clientSlug: 'alpha',
	brand: {
		displayName: 'Client Alpha Dental',
		tagline: null,
		audience: 'Local patients who need implant consults',
		offer: 'Guided implant consults with a clear treatment plan',
		primaryConversion: 'Book an implant consult',
		brandPersonality: 'premium' as const,
		tokens: { accent: '#0f4c5c' }
	},
	services: [
		{
			name: 'Implant consult',
			outcome: 'A clear implant plan in one visit',
			summary: 'Assessment, imaging review, and next-step recommendation.'
		}
	],
	offers: [
		{
			name: 'Consult package',
			summary: 'Exam and written treatment plan',
			startingPriceMinor: 15000,
			currency: 'USD'
		}
	],
	claims: [
		{
			kind: 'approved' as const,
			statement: 'Consults include a written treatment plan',
			evidence: null
		}
	]
};

test('premium compose uses editorial variants and the First Reveal Gate can pass without a logo', () => {
	const document = composeLeadPage(premiumKnowledge, { preview: true });
	expect(document.sections[0]?.type).toBe('hero-editorial');
	expect(document.sections.some((section) => section.type === 'services-editorial')).toBe(true);
	expect(document.sections.some((section) => section.type === 'proof-featured')).toBe(true);
	expect(document.sections.some((section) => section.type === 'cta-minimal')).toBe(true);
	const gate = evaluateFirstRevealGate({ document, preview: true, hasLogo: false });
	expect(gate.passed).toBe(true);
	expect(gate.checks.find((item) => item.key === 'hero_identity')?.passed).toBe(true);
});

test('placeholder copy and split-without-logo fail the First Reveal Gate', () => {
	const document = composeLeadPage(
		{
			...premiumKnowledge,
			brand: {
				...premiumKnowledge.brand,
				brandPersonality: 'corporate',
				offer: 'Lorem ipsum consults with YOUR LOGO here'
			}
		},
		{ preview: true }
	);
	expect(document.sections[0]?.type).toBe('hero-split');
	const gate = evaluateFirstRevealGate({ document, preview: true, hasLogo: false });
	expect(gate.passed).toBe(false);
	expect(gate.checks.find((item) => item.key === 'placeholder_copy')?.passed).toBe(false);
	expect(gate.checks.find((item) => item.key === 'hero_identity')?.passed).toBe(false);
});

test('missing TenantContext cannot read goals', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listClientGoalsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('user on client A cannot read or write client B goals', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.91'
	);
	const ctx = contextFor(session, 'goals-read');
	expect(ctx.clientId).toBe(alpha.id);
	const own = await getClientOutcomes(session, ctx);
	expect(JSON.stringify(own)).not.toContain(beta.id);

	await expect(getClientOutcomes(session, ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		upsertClientGoal(
			session,
			{ ...ctx, clientId: beta.id },
			{
				name: 'Hijack',
				goalType: 'sales',
				targetValue: 1,
				unit: 'sales',
				period: 'month',
				isPrimary: true
			},
			'goals-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant goals through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.6.40'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/goals/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
});

test('primary goal, notification defaults, and data health stay tenant-scoped', async () => {
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.9.10', 'goals-alpha');
	const ctx = contextFor(actor, 'goals-alpha');
	const goal = await upsertClientGoal(
		actor,
		ctx,
		{
			name: 'Qualified implant consults',
			goalType: 'qualified_leads',
			targetValue: 8,
			unit: 'qualified leads',
			period: 'month',
			isPrimary: true
		},
		'goals-alpha'
	);
	expect(goal.clientId).toBe(alpha.id);
	expect(goal.isPrimary).toBe(true);

	const outcomes = await getClientOutcomes(actor, ctx);
	expect(outcomes.primary?.id).toBe(goal.id);
	expect(outcomes.notifications.map((row) => row.topic).sort()).toEqual([
		'data_health_alert',
		'high_intent_lead',
		'weekly_digest'
	]);
	expect(outcomes.notifications.find((row) => row.topic === 'high_intent_lead')?.enabled).toBe(
		true
	);
	expect(outcomes.notifications.find((row) => row.topic === 'weekly_digest')?.enabled).toBe(false);
	expect(outcomes.health.some((row) => row.checkKey === 'production_page_views')).toBe(true);
	expect(JSON.stringify(outcomes)).not.toContain(beta.id);

	const betaActor = await adminOn(beta.id, '10.0.9.11', 'goals-beta');
	const betaCtx = contextFor(betaActor, 'goals-beta');
	const betaOutcomes = await getClientOutcomes(betaActor, betaCtx);
	expect(betaOutcomes.goals.some((row) => row.id === goal.id)).toBe(false);
	expect(JSON.stringify(betaOutcomes)).not.toContain('Qualified implant consults');
});

test('compose records a First Reveal Gate and override does not leak tenants', async () => {
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.9.12', 'reveal-alpha');
	const ctx = contextFor(actor, 'reveal-alpha');
	await composeFunnel(actor, ctx, 'reveal-alpha-c');
	const funnel = await getFunnel(actor, ctx);
	expect(funnel.firstReveal).not.toBeNull();
	expect(funnel.firstReveal?.checks.length).toBeGreaterThan(0);

	if (!funnel.draft) throw new Error('draft missing');
	await upsertFirstRevealGateForTenant(ctx, {
		pageVersionId: funnel.draft.id,
		gateVersion: 1,
		passed: false,
		checks: funnel.firstReveal?.checks ?? []
	});
	const overridden = await overrideFirstRevealGate(
		actor,
		ctx,
		{ reason: 'Client approved a typography-led preview for this launch.' },
		'reveal-override'
	);
	expect(overridden.clientId).toBe(alpha.id);
	expect(overridden.overrideReason).toContain('typography-led');

	await expect(
		overrideFirstRevealGate(
			actor,
			{ ...ctx, clientId: beta.id },
			{ reason: 'Client approved a typography-led preview for this launch.' },
			'reveal-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('hostname-scoped brand logo does not serve another tenant', async () => {
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.9.13', 'logo-alpha');
	const ctx = contextFor(actor, 'logo-alpha');
	await uploadBrandAsset(
		actor,
		ctx,
		{
			purpose: 'logo',
			filename: 'alpha-logo.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'logo-alpha-up'
	);
	expect(await hasBrandLogoForTenant(ctx)).toBe(true);

	const alphaHost = `${previewHostname('alpha', env.DELIVERY_PREVIEW_PARENT_HOST)}:5184`;
	const betaHost = previewHostname('beta', env.DELIVERY_PREVIEW_PARENT_HOST);
	const alphaLogo = await resolveDeliveryPage(alphaHost, '/brand-logo', 'logo-alpha-res');
	const betaLogo = await resolveDeliveryPage(betaHost, '/brand-logo', 'logo-beta-res');
	expect(alphaLogo.kind).toBe('brand_logo');
	expect(betaLogo.kind).toBe('brand_logo');
	if (alphaLogo.kind !== 'brand_logo' || betaLogo.kind !== 'brand_logo') {
		throw new Error('expected brand logo resolutions');
	}
	expect(alphaLogo.clientId).toBe(alpha.id);
	expect(betaLogo.clientId).toBe(beta.id);

	const bytes = await getDeliveryBrandLogoBytes(ctx);
	expect(bytes.mimeType).toBe('image/png');
	expect(bytes.bytes.byteLength).toBe(PNG_1X1.byteLength);
	expect(bytes.asset.clientId).toBe(alpha.id);
	expect(bytes.asset.storageKey).toContain(alpha.id);
	expect(bytes.asset.storageKey).not.toContain(beta.id);

	const betaActor = await adminOn(beta.id, '10.0.9.14', 'logo-beta');
	const betaCtx = contextFor(betaActor, 'logo-beta');
	const betaAsset = await getLatestLogoAssetForTenant(betaCtx);
	if (betaAsset) {
		expect(betaAsset.clientId).toBe(beta.id);
		expect(betaAsset.storageKey).not.toContain(alpha.id);
		const betaBytes = await getDeliveryBrandLogoBytes(betaCtx);
		expect(betaBytes.asset.clientId).toBe(beta.id);
	} else {
		await expect(getDeliveryBrandLogoBytes(betaCtx)).rejects.toBeInstanceOf(NotFoundError);
	}
	expect(JSON.stringify(betaLogo)).not.toContain(alpha.id);
});

test('missing goals.manage cannot create a goal', async () => {
	const { alpha } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.9.15'
	);
	await switchActiveClient(session, session.token, alpha.id, 'goals-cap');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'goals-cap');
	await expect(
		upsertClientGoal(
			{ ...actor, permissions: actor.permissions.filter((cap) => cap !== 'goals.manage') },
			ctx,
			{
				name: 'Denied',
				goalType: 'sales',
				targetValue: 1,
				unit: 'sales',
				period: 'month',
				isPrimary: true
			},
			'goals-cap'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('notification defaults cannot be written across tenants', async () => {
	const { beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.9.16'
	);
	const ctx = contextFor(session, 'notify-hijack');
	await expect(
		updateNotificationPreference(
			session,
			{ ...ctx, clientId: beta.id },
			{ topic: 'weekly_digest', enabled: true },
			'notify-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
	expect(listNotificationPreferencesForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
});
