import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import { TenantContextError, revenueLinkedStatement } from '@vector/contracts';
import { attributionResults, contacts, db, leads } from '@vector/db';
import {
	contextFor,
	getClientValueProof,
	login,
	recordRevenueEvent,
	resolveSession,
	saveClientValueProfile,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';

const root = join(import.meta.dir, '..');

test('a revenue-to-fee figure stays unlabeled until coverage exists', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/value/+page.svelte'), 'utf8');
	expect(page).toContain('Revenue and the package fee');
	expect(page).toContain('Replacement cost is not shown');
	const missing = revenueLinkedStatement({
		feeMinor: 3_500_000,
		feeCurrency: 'PHP',
		revenueMinor: null,
		revenueCurrency: null,
		revenueEvidence: 'unknown',
		revenueCount: 0,
		attributionEvidence: 'measured'
	});
	expect(missing.status).toBe('unknown');
	expect(missing.ratioLabel).toBeNull();
	expect(missing.detail.toLowerCase()).not.toContain('roi');
	const uncovered = revenueLinkedStatement({
		feeMinor: 3_500_000,
		feeCurrency: 'PHP',
		revenueMinor: 38_600_000,
		revenueCurrency: 'PHP',
		revenueEvidence: 'observed',
		revenueCount: 1,
		attributionEvidence: 'unknown'
	});
	expect(uncovered.ratioLabel).toBeNull();
	const linked = revenueLinkedStatement({
		feeMinor: 3_500_000,
		feeCurrency: 'PHP',
		revenueMinor: 38_600_000,
		revenueCurrency: 'PHP',
		revenueEvidence: 'observed',
		revenueCount: 1,
		attributionEvidence: 'observed'
	});
	expect(linked.status).toBe('linked');
	expect(linked.ratioLabel).toBe('11.0×');
	expect(linked.detail).toContain('not profit');
	expect(linked.detail.toLowerCase()).not.toContain('roi');
	const mismatch = revenueLinkedStatement({
		feeMinor: 3_500_000,
		feeCurrency: 'USD',
		revenueMinor: 38_600_000,
		revenueCurrency: 'PHP',
		revenueEvidence: 'observed',
		revenueCount: 1,
		attributionEvidence: 'measured'
	});
	expect(mismatch.ratioLabel).toBeNull();
});

test(
	'recorded revenue stays on its client and becomes a ratio only with attribution coverage',
	async () => {
		const { session } = await login(
			{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
			'10.0.24.10'
		);
		const north = await createClient(
			session,
			{
				name: 'V3 Northline House',
				slug: `v3n-${crypto.randomUUID().slice(0, 8)}`,
				timezone: 'UTC'
			},
			'v3-north'
		);
		const south = await createClient(
			session,
			{ name: 'V3 Southline Inn', slug: `v3s-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
			'v3-south'
		);
		await switchActiveClient(session, session.token, north.id, 'v3-switch');
		const actor = await resolveSession(session.token);
		if (!actor) throw new Error('session missing');
		const ctx = contextFor(actor, 'v3-ctx');
		await saveClientValueProfile(
			actor,
			ctx,
			{ packageName: 'Growth', feeMinor: 3_500_000, currency: 'PHP' },
			'v3-fee'
		);
		await recordRevenueEvent(
			actor,
			ctx,
			{ amountMinor: 38_600_000, currency: 'PHP', idempotencyKey: `v3-${crypto.randomUUID()}` },
			'v3-revenue'
		);
		const before = await getClientValueProof(actor, ctx);
		expect(before.revenueLink.ratioLabel).toBeNull();
		expect(before.revenueLink.detail).toContain('Attribution coverage');

		const [contact] = await db
			.insert(contacts)
			.values({
				organizationId: ctx.organizationId,
				clientId: ctx.clientId,
				displayName: 'V3 Lead',
				email: `v3-${crypto.randomUUID()}@v3.test`
			})
			.returning();
		const [lead] = await db
			.insert(leads)
			.values({
				organizationId: ctx.organizationId,
				clientId: ctx.clientId,
				contactId: contact!.id,
				status: 'won',
				hostname: 'v3.example.test',
				domainKind: 'custom',
				isTest: false
			})
			.returning();
		await db.insert(attributionResults).values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			leadId: lead!.id,
			firstTouchChannel: 'email',
			lastNonDirectChannel: 'email',
			evidenceClass: 'observed'
		});
		const proof = await getClientValueProof(actor, ctx);
		expect(proof.revenueLink.status).toBe('linked');
		expect(proof.revenueLink.ratioLabel).toBe('11.0×');
		expect(proof.revenueLink.detail).toContain('PHP 386000.00');
		expect(JSON.stringify(proof)).not.toContain('V3 Southline Inn');

		await switchActiveClient(session, session.token, south.id, 'v3-south-switch');
		const southActor = await resolveSession(session.token);
		if (!southActor) throw new Error('session missing');
		const other = await getClientValueProof(southActor, contextFor(southActor, 'v3-south-proof'));
		expect(other.revenueLink.status).toBe('unknown');
		expect(other.revenueLink.ratioLabel).toBeNull();
		expect(JSON.stringify(other)).not.toContain('386000');
		expect(JSON.stringify(other)).not.toContain('11.0×');

		try {
			await getClientValueProof(southActor, undefined as never);
			throw new Error('expected a tenant error');
		} catch (error) {
			expect(error).toBeInstanceOf(TenantContextError);
		}
	},
	{ timeout: 20_000 }
);
