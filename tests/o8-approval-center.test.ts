import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { MemoryAIProvider } from '@vector/ai';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	approvalCenterGroupFor,
	requireTenantContext
} from '@vector/contracts';
import { clients, db, listApprovalRequestsForTenant } from '@vector/db';
import {
	contextFor,
	createClient,
	decideApprovalCenterGroup,
	decideIntelligenceApproval,
	getApprovalCenter,
	login,
	resolveSession,
	runIntelligence,
	saveOutcomesQuickStart,
	setDomainAIProvider,
	resetDomainAIProvider,
	switchActiveClient
} from '@vector/domain';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');
const memory = new MemoryAIProvider();

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
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

afterEach(() => {
	resetDomainAIProvider();
	memory.reset();
});

test('Approval Center groups existing action types without a second queue', () => {
	expect(approvalCenterGroupFor('copy.recommend')).toBe('content');
	expect(approvalCenterGroupFor('funnel_strategist.recommend')).toBe('content');
	expect(approvalCenterGroupFor('social.publish')).toBe('campaigns');
	expect(approvalCenterGroupFor('email.send')).toBe('campaigns');
	expect(approvalCenterGroupFor('launch.generate_drafts')).toBe('site_direction');
	expect(approvalCenterGroupFor('domain.activate')).toBe('connections');
	const page = readFileSync(join(root, 'apps/control/src/routes/approvals/+page.svelte'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/approvals.ts'), 'utf8');
	expect(page).toContain('Items that need your decision');
	expect(page).toContain('campaigns, content, site direction, and connections');
	expect(page).toContain('Approve all');
	expect(page).not.toContain('OAuth token');
	expect(domain).not.toContain('pgTable');
	expect(domain).toContain('listApprovalRequestsForTenant');
	expect(domain).toContain('decideIntelligenceApproval');
});

test('missing TenantContext cannot read Approval Center rows', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(listApprovalRequestsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('user on client A cannot list client B Approval Center items', async () => {
	setDomainAIProvider(memory);
	const { alpha, beta } = await seededClients();
	const admin = await adminOn(beta.id, '10.0.9.2', 'o8-beta-seed');
	await runIntelligence(
		admin,
		contextFor(admin, 'o8-beta-seed'),
		{ agentKey: 'copy' },
		'o8-beta-seed'
	);
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.9.3'
	);
	const ctx = contextFor(session, 'o8-iso');
	expect(ctx.clientId).toBe(alpha.id);
	const own = await getApprovalCenter(session, ctx);
	expect(JSON.stringify(own)).not.toContain(beta.id);
	expect(own.groups.every((group) => group.items.every((item) => item.clientId === alpha.id))).toBe(
		true
	);
	await expect(getApprovalCenter(session, ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant Approval Center through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/approvals/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
});

test('Approval Center lists copy drafts under Content on the existing queue', async () => {
	setDomainAIProvider(memory);
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.9.4'
	);
	const created = await createClient(
		session,
		{ name: 'O8 Content Client', slug: `o8-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o8-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o8-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'o8-content');
	await runIntelligence(actor, ctx, { agentKey: 'copy' }, 'o8-content');
	const center = await getApprovalCenter(actor, ctx);
	expect(center.assignedToOther).toBe(false);
	const content = center.groups.find((group) => group.key === 'content');
	expect(content?.items.some((item) => item.actionType === 'copy.recommend')).toBe(true);
	expect(content?.items.every((item) => item.clientId === created.id)).toBe(true);
});

test('a reviewer who is not the QuickStart approver does not see assigned items', async () => {
	setDomainAIProvider(memory);
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.9.5'
	);
	const created = await createClient(
		session,
		{ name: 'O8 Assigned Client', slug: `o8a-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o8-assign-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o8-assign-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'o8-assign');
	await saveOutcomesQuickStart(
		actor,
		ctx,
		{
			goalChoice: 'qualified_leads',
			goalOther: null,
			hasTarget: false,
			targetValue: null,
			period: null,
			currency: null,
			goodLead: 'inquiry',
			goodLeadOther: null,
			afterContact: 'call',
			afterContactOther: null,
			sale: 'paid',
			saleOther: null,
			crm: 'later',
			crmNote: null,
			notifyHighIntent: true,
			approver: 'self',
			approverNote: null
		},
		'o8-assign-qs'
	);
	await runIntelligence(actor, ctx, { agentKey: 'research' }, 'o8-assign-run');
	const reviewer = {
		...actor,
		userId: '00000000-0000-4000-8000-000000000099',
		permissions: actor.permissions.filter((cap) => cap !== 'ai.manage')
	};
	const hidden = await getApprovalCenter(reviewer, ctx);
	expect(hidden.assignedToOther).toBe(true);
	expect(hidden.pendingCount).toBe(0);
	const owner = await getApprovalCenter(actor, ctx);
	expect(owner.pendingCount).toBeGreaterThan(0);
});

test('missing capability cannot bundle-decide Approval Center items', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.9.6'
	);
	const reader = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'ai.manage')
	};
	await expect(
		decideApprovalCenterGroup(
			reader,
			contextFor(session, 'o8-cap'),
			{ group: 'content', decision: 'approved' },
			'o8-cap'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		decideIntelligenceApproval(
			reader,
			contextFor(session, 'o8-cap-one'),
			{ id: '00000000-0000-4000-8000-000000000001', decision: 'approved' },
			'o8-cap-one'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});
