import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	mapQuickStartGoal,
	requireTenantContext,
	saveOutcomesQuickStartSchema
} from '@vector/contracts';
import {
	clients,
	db,
	getOutcomesQuickStartForTenant,
	listClientGoalsForTenant,
	listLeadsForTenant,
	listNotificationPreferencesForTenant
} from '@vector/db';
import {
	contextFor,
	createClient,
	getKnowledge,
	getOutcomesQuickStart,
	login,
	resolveSession,
	saveOutcomesQuickStart,
	switchActiveClient
} from '@vector/domain';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function scopedActor(name: string, ip = '10.0.8.20') {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `cu1-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'cu1-create'
	);
	await switchActiveClient(session, session.token, created.id, 'cu1-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'cu1-save') };
}

const baseAnswers = {
	goalChoice: 'qualified_leads' as const,
	goalOther: null,
	hasTarget: true,
	targetValue: 12,
	period: 'month' as const,
	currency: null,
	goodLead: 'fit' as const,
	goodLeadOther: null,
	afterContact: 'call' as const,
	afterContactOther: null,
	sale: 'paid' as const,
	saleOther: null,
	crm: 'later' as const,
	crmNote: null,
	notifyHighIntent: true,
	approver: 'self' as const,
	approverNote: null
};

test('QuickStart schema maps goals without inventing a pipeline enum', () => {
	expect(saveOutcomesQuickStartSchema.safeParse(baseAnswers).success).toBe(true);
	expect(mapQuickStartGoal(baseAnswers).goalType).toBe('qualified_leads');
	expect(
		mapQuickStartGoal({ ...baseAnswers, goalChoice: 'subscriptions', hasTarget: false }).goalType
	).toBe('custom');
	const page = readFileSync(join(root, 'apps/control/src/routes/quickstart/+page.svelte'), 'utf8');
	const overview = readFileSync(join(root, 'apps/control/src/routes/+page.svelte'), 'utf8');
	const goals = readFileSync(join(root, 'apps/control/src/routes/goals/+page.svelte'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/outcomes.ts'), 'utf8');
	expect(page).toContain('What would you most like Vector to improve?');
	expect(page).toContain('What counts as a good lead?');
	expect(page).toContain('What usually happens after someone becomes a lead?');
	expect(page).toContain('What counts as a sale?');
	expect(page).toContain('Do you already use a CRM or booking system?');
	expect(page).toContain('high-intent leads');
	expect(page).toContain('Who approves campaigns?');
	expect(page).toContain('You do not need to fill a Knowledge encyclopedia');
	expect(overview).toContain('Start QuickStart');
	expect(goals).toContain('Answer QuickStart questions');
	expect(domain).not.toContain('getKnowledge');
	expect(domain).not.toContain('lead_status');
	expect(domain).not.toContain('CRMProvider');
});

test('missing TenantContext cannot read QuickStart', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(getOutcomesQuickStartForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('user on client A cannot read or write client B QuickStart', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.82'
	);
	const ctx = contextFor(session, 'cu1-read');
	expect(ctx.clientId).toBe(alpha.id);
	const own = await getOutcomesQuickStart(session, ctx);
	expect(JSON.stringify(own)).not.toContain(beta.id);

	await expect(getOutcomesQuickStart(session, ctx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(
		saveOutcomesQuickStart(session, { ...ctx, clientId: beta.id }, baseAnswers, 'cu1-hijack')
	).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant QuickStart through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.8.22'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/outcomes/quickstart/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
});

test('QuickStart writes goal and high-intent prefs without Knowledge or a CRM', async () => {
	const { actor, created, ctx } = await scopedActor('QuickStart Bare Client');
	const knowledge = await getKnowledge(actor, ctx);
	expect(knowledge.brand).toBeFalsy();
	expect(knowledge.services.length).toBe(0);

	const leadsBefore = await listLeadsForTenant(ctx);
	const saved = await saveOutcomesQuickStart(actor, ctx, baseAnswers, 'cu1-save');
	expect(saved.clientId).toBe(created.id);
	expect(saved.afterContact).toBe('call');
	expect(saved.crm).toBe('later');
	expect(saved.notifyHighIntent).toBe(true);
	expect(saved.approverUserId).toBe(actor.userId);

	const goals = await listClientGoalsForTenant(ctx);
	expect(goals.some((row) => row.isPrimary && row.targetValue === 12)).toBe(true);
	expect(goals.every((row) => row.clientId === created.id)).toBe(true);

	const prefs = await listNotificationPreferencesForTenant(ctx);
	expect(
		prefs.some(
			(row) => row.topic === 'high_intent_lead' && row.enabled && row.clientId === created.id
		)
	).toBe(true);

	const leadsAfter = await listLeadsForTenant(ctx);
	expect(leadsAfter.length).toBe(leadsBefore.length);
});

test('QuickStart without a target does not invent a numeric goal', async () => {
	const { actor, ctx } = await scopedActor('QuickStart No Target', '10.0.8.21');
	const saved = await saveOutcomesQuickStart(
		actor,
		ctx,
		{ ...baseAnswers, hasTarget: false, targetValue: null, period: null, notifyHighIntent: false },
		'cu1-notarget'
	);
	expect(saved.hasTarget).toBe(false);
	expect(saved.targetValue).toBeNull();
	expect(saved.notifyHighIntent).toBe(false);
	expect(await listClientGoalsForTenant(ctx)).toEqual([]);
});

test('missing capability cannot save QuickStart', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.83'
	);
	const reader = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'goals.manage')
	};
	await expect(
		saveOutcomesQuickStart(reader, contextFor(session, 'cu1-cap'), baseAnswers, 'cu1-cap')
	).rejects.toBeInstanceOf(ForbiddenError);
});
