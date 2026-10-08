import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import { TenantContextError, ValidationError, clientBaselineStatement } from '@vector/contracts';
import { insertClientValueBaselineForTenant } from '@vector/db';
import {
	contextFor,
	getClientValueProof,
	login,
	recordClientValueBaseline,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';

const root = join(import.meta.dir, '..');

test('V2 baseline copy stays an estimate', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/value/+page.svelte'), 'utf8');
	expect(page).toContain('Client-stated estimate');
	expect(page).toContain('Save a new version');
	expect(page).toContain('will not invent one');
	const statement = clientBaselineStatement(2);
	expect(statement.label).toBe('estimated');
	expect(statement.evidence).toBe('client_confirmed');
	expect(statement.detail.toLowerCase()).not.toContain('roi');
	expect(statement.detail).not.toContain('%');
});

test(
	'a client baseline is versioned, estimated, and invisible to another client',
	async () => {
		const { session } = await login(
			{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
			'10.0.23.10'
		);
		const north = await createClient(
			session,
			{
				name: 'V2 Northline House',
				slug: `v2n-${crypto.randomUUID().slice(0, 8)}`,
				timezone: 'UTC'
			},
			'v2-north'
		);
		const south = await createClient(
			session,
			{ name: 'V2 Southline Inn', slug: `v2s-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
			'v2-south'
		);
		await switchActiveClient(session, session.token, north.id, 'v2-switch');
		const northActor = await resolveSession(session.token);
		if (!northActor) throw new Error('session missing');
		const northCtx = contextFor(northActor, 'v2-north-ctx');

		const first = await recordClientValueBaseline(
			northActor,
			northCtx,
			{ amountMinor: 9_200_000, currency: 'php' },
			'v2-1'
		);
		expect(first.version).toBe(1);
		expect(first.label).toBe('estimated');
		const proof = await getClientValueProof(northActor, northCtx);
		expect(proof.baseline?.amountMinor).toBe(9_200_000);
		expect(proof.baseline?.currency).toBe('PHP');
		expect(proof.baseline?.label).toBe('estimated');
		expect(proof.baseline?.evidence).toBe('client_confirmed');
		expect(proof.baseline?.earlierVersions).toBe(0);
		expect(JSON.stringify(proof)).not.toContain('V2 Southline Inn');

		const second = await recordClientValueBaseline(
			northActor,
			northCtx,
			{ amountMinor: 8_000_000, currency: 'PHP' },
			'v2-2'
		);
		expect(second.version).toBe(2);
		const again = await getClientValueProof(northActor, northCtx);
		expect(again.baseline?.version).toBe(2);
		expect(again.baseline?.amountMinor).toBe(8_000_000);
		expect(again.baseline?.earlierVersions).toBe(1);
		expect(again.baseline?.detail).toContain('Estimated');
		expect(first.amountMinor).toBe(9_200_000);

		try {
			await recordClientValueBaseline(
				northActor,
				northCtx,
				{ amountMinor: 1.5, currency: 'PHP' },
				'v2-bad'
			);
			throw new Error('expected a validation error');
		} catch (error) {
			expect(error).toBeInstanceOf(ValidationError);
		}
		try {
			await insertClientValueBaselineForTenant(undefined as never, {
				amountMinor: 100,
				currency: 'PHP',
				recordedBy: null
			});
			throw new Error('expected a tenant error');
		} catch (error) {
			expect(error).toBeInstanceOf(TenantContextError);
		}

		await switchActiveClient(session, session.token, south.id, 'v2-south-switch');
		const southActor = await resolveSession(session.token);
		if (!southActor) throw new Error('session missing');
		const other = await getClientValueProof(southActor, contextFor(southActor, 'v2-south-proof'));
		expect(other.baseline).toBeNull();
		expect(JSON.stringify(other)).not.toContain('9200000');
		expect(JSON.stringify(other)).not.toContain('8000000');
	},
	{ timeout: 20_000 }
);
