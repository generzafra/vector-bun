import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { ForbiddenError, TenantContextError, requireTenantContext } from '@vector/contracts';
import {
	clients,
	contacts,
	db,
	emailMessages,
	emailSequenceEnrollments,
	emailSequences,
	getTodayFactsForTenant,
	leadScores,
	leads,
	socialAccounts,
	socialConnections,
	socialPosts,
	socialPublications
} from '@vector/db';
import {
	TODAY_HIGH_INTENT_MIN_SCORE,
	clientDayWindow,
	contextFor,
	getClientToday,
	login,
	recordSalesOutcome,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

async function seededClients() {
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function scopedActor(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `o5-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o5-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o5-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o5-ctx') };
}

async function insertLead(
	ctx: { organizationId: string; clientId: string },
	email: string,
	createdAt: Date,
	isTest = false
) {
	const [contact] = await db
		.insert(contacts)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			displayName: 'O5 Lead',
			email
		})
		.returning();
	const [lead] = await db
		.insert(leads)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			contactId: contact.id,
			status: 'new',
			hostname: 'o5.example.test',
			domainKind: 'custom',
			isTest,
			createdAt
		})
		.returning();
	return { contact, lead };
}

test('today copy stays observed and does not invent channel movement', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/today/+page.svelte'), 'utf8');
	expect(page).toContain('What needs you');
	expect(page).toContain('What Vector handled');
	expect(page).toContain('Important changes');
	expect(page).not.toContain('SEO');
	expect(page).not.toContain('+21%');
	expect(page).not.toContain('ROI');
	expect(TODAY_HIGH_INTENT_MIN_SCORE).toBe(50);
	const manila = clientDayWindow('Asia/Manila', new Date('2026-10-07T16:30:00.000Z'));
	expect(manila.start.toISOString()).toBe('2026-10-07T16:00:00.000Z');
	expect(manila.label).toContain('8');
	expect(manila.previousStart.getTime()).toBeLessThan(manila.start.getTime());
	expect(manila.end.getTime()).toBeGreaterThan(manila.start.getTime());
	expect(clientDayWindow('Not/AZone').timeZone).toBe('UTC');
});

test('missing TenantContext cannot read today facts', async () => {
	const day = clientDayWindow('UTC');
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(
		getTodayFactsForTenant(null as never, day, TODAY_HIGH_INTENT_MIN_SCORE)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('today counts this local day only and leaves revenue unlabeled', async () => {
	const { actor, ctx } = await scopedActor('O5 Today', '10.0.22.10');
	const day = clientDayWindow('UTC');
	const fresh = await insertLead(ctx, `o5-new-${crypto.randomUUID()}@o5.test`, new Date());
	const intent = await insertLead(ctx, `o5-hot-${crypto.randomUUID()}@o5.test`, new Date());
	const quiet = await insertLead(ctx, `o5-quiet-${crypto.randomUUID()}@o5.test`, new Date());
	await insertLead(
		ctx,
		`o5-old-${crypto.randomUUID()}@o5.test`,
		new Date(day.previousStart.getTime() + 60_000)
	);
	await insertLead(ctx, `o5-test-${crypto.randomUUID()}@o5.test`, new Date(), true);
	await db.insert(leadScores).values([
		{
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			leadId: intent.lead.id,
			score: 50
		},
		{
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			leadId: quiet.lead.id,
			score: 40
		}
	]);
	await recordSalesOutcome(
		actor,
		ctx,
		{ leadId: fresh.lead.id, outcomeType: 'won', amountMinor: 4400, currency: 'USD' },
		'o5-won'
	);
	const [sequence] = await db
		.insert(emailSequences)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			key: `welcome-${crypto.randomUUID().slice(0, 8)}`,
			name: 'Welcome'
		})
		.returning();
	const [enrollment] = await db
		.insert(emailSequenceEnrollments)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			sequenceId: sequence.id,
			contactId: fresh.contact.id,
			leadId: fresh.lead.id,
			email: 'fresh@o5.test'
		})
		.returning();
	await db.insert(emailMessages).values({
		organizationId: ctx.organizationId,
		clientId: ctx.clientId,
		contactId: fresh.contact.id,
		leadId: fresh.lead.id,
		enrollmentId: enrollment.id,
		sequenceId: sequence.id,
		toAddress: 'fresh@o5.test',
		fromAddress: 'hello@o5.test',
		subject: 'Welcome',
		status: 'sent',
		idempotencyKey: `o5-${crypto.randomUUID()}`,
		isTest: false
	});
	const [connection] = await db
		.insert(socialConnections)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			platform: 'linkedin',
			status: 'active'
		})
		.returning();
	const [account] = await db
		.insert(socialAccounts)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			connectionId: connection.id,
			platform: 'linkedin',
			externalAccountId: 'o5-page',
			handle: 'o5',
			displayName: 'O5'
		})
		.returning();
	const [post] = await db
		.insert(socialPosts)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			status: 'published',
			body: 'Hello',
			similarityHash: `o5-${crypto.randomUUID()}`
		})
		.returning();
	await db.insert(socialPublications).values({
		organizationId: ctx.organizationId,
		clientId: ctx.clientId,
		postId: post.id,
		accountId: account.id,
		connectionId: connection.id,
		platform: 'linkedin',
		status: 'published',
		idempotencyKey: `o5-pub-${crypto.randomUUID()}`,
		publishedAt: new Date()
	});

	const today = await getClientToday(actor, ctx);
	expect(today.newLeads.count).toBe(3);
	expect(today.highIntent.count).toBe(1);
	expect(today.sales.count).toBe(1);
	expect(today.revenue.detail).toBe('No revenue recorded today.');
	expect(today.handled.items.map((item) => item.detail)).toEqual([
		'Sent 1 nurture message.',
		'Published 1 social post.'
	]);
	expect(today.changes.detail).toBe('3 new leads today. 1 yesterday.');
	expect(JSON.stringify(today)).not.toContain('4400');
	expect(JSON.stringify(today)).not.toContain('%');
});

test('another tenant cannot read today, and missing access does not invent zeros', async () => {
	const { actor, ctx, created } = await scopedActor('O5 Isolation', '10.0.22.11');
	await insertLead(ctx, `o5-iso-${crypto.randomUUID()}@o5.test`, new Date());
	const limited = {
		...actor,
		permissions: actor.permissions.filter((permission) => !permission.startsWith('leads.'))
	};
	const hidden = await getClientToday(limited, ctx);
	expect(hidden.newLeads.evidenceClass).toBe('unknown');
	expect(hidden.newLeads.count).toBeNull();
	expect(hidden.sales.count).toBeNull();

	const stripped = {
		...actor,
		permissions: actor.permissions.filter(
			(permission) =>
				permission !== 'leads.read' &&
				permission !== 'goals.read' &&
				permission !== 'ai.read' &&
				permission !== 'email.read' &&
				permission !== 'social.read'
		)
	};
	await expect(getClientToday(stripped, ctx)).rejects.toBeInstanceOf(ForbiddenError);

	const { beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.22.12'
	);
	const alphaCtx = contextFor(session, 'o5-alpha');
	await expect(getClientToday(session, alphaCtx, created.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	const own = await getClientToday(session, alphaCtx);
	expect(JSON.stringify(own)).not.toContain(created.id);

	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.22.13'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/today/${created.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text).not.toContain(created.name);
	expect(text.toLowerCase()).not.toContain(beta.name.toLowerCase());
});
