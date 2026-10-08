import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import { ValidationError } from '@vector/contracts';
import {
	getCreativeQaReviewForVersionForTenant,
	getLatestDraftForTenant,
	getPublishedHomeForTenant,
	listVisualDirectionsForVersionForTenant
} from '@vector/db';
import {
	addService,
	composeFunnel,
	contextFor,
	decideClientReveal,
	getClientReveal,
	login,
	resolveSession,
	runCreativeQa,
	saveBrand,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';

const root = join(import.meta.dir, '..');

test('the reveal page asks for a plain change and does not publish', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/reveal/+page.svelte'), 'utf8');
	const catalog = readFileSync(join(root, 'packages/contracts/src/reveal-changes.ts'), 'utf8');
	expect(catalog).toContain('Change the photos');
	expect(page).toContain('REVEAL_CHANGE_CATEGORIES');
	expect(page).toContain('{category.label}');
	expect(page).toContain('Approving does not publish');
	expect(page).toContain('Request changes');
	expect(page).not.toContain('storageKey');
	expect(page).not.toContain('heroVariant');
	expect(page).not.toContain('widthMode');
});

test('a change request stays on this tenant direction and does not publish', async () => {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.20.10'
	);
	async function clientNamed(name: string) {
		const created = await createClient(
			session,
			{ name, slug: `ce6-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
			'ce6-create'
		);
		await switchActiveClient(session, session.token, created.id, 'ce6-switch');
		const actor = await resolveSession(session.token);
		if (!actor) throw new Error('session missing');
		const ctx = contextFor(actor, 'ce6-ctx');
		await saveBrand(
			actor,
			ctx,
			{
				displayName: name,
				audience: `Buyers considering ${name}`,
				offer: `A confirmed offer from ${name}`,
				primaryConversion: 'Request a walkthrough',
				brandPersonality: 'premium',
				tokens: { accent: '#111111', background: '#111111', text: '#f4f4f0' }
			},
			'ce6-brand'
		);
		await addService(
			actor,
			ctx,
			{
				name: 'Walkthrough',
				slug: `walk-${crypto.randomUUID().slice(0, 8)}`,
				outcome: 'A clear next step',
				summary: 'One meeting about the confirmed offer.'
			},
			'ce6-service'
		);
		const draft = await composeFunnel(actor, ctx, `ce6-compose-${created.id}`);
		await runCreativeQa(actor, ctx, {}, `ce6-qa-${created.id}`);
		return { actor, ctx, created, draft };
	}
	const north = await clientNamed('CE6 Northline House');
	const south = await clientNamed('CE6 Southline Inn');
	const before = await getLatestDraftForTenant(north.ctx);
	await expect(
		decideClientReveal(
			north.actor,
			north.ctx,
			{ decision: 'changes_requested', note: 'Use the courtyard photo', categories: ['webgl'] },
			'ce6-bad'
		)
	).rejects.toBeInstanceOf(ValidationError);
	const decided = await decideClientReveal(
		north.actor,
		north.ctx,
		{ decision: 'changes_requested', note: 'Use the courtyard photo', categories: ['photos'] },
		'ce6-changes'
	);
	expect(decided.status).toBe('changes_requested');
	const selected = (
		await listVisualDirectionsForVersionForTenant(north.ctx, north.draft.draft.id)
	).find((row) => row.direction.status === 'selected');
	const review = await getCreativeQaReviewForVersionForTenant(north.ctx, north.draft.draft.id);
	expect(review?.changeCategories).toEqual(['photos']);
	expect(review?.priorDirectionId).toBe(selected?.direction.id);
	expect(review?.revisionNote).toBe('Use the courtyard photo');
	expect(await getCreativeQaReviewForVersionForTenant(south.ctx, north.draft.draft.id)).toBeNull();
	const reveal = await getClientReveal(north.actor, north.ctx);
	expect(reveal.ready).toBe(true);
	if (reveal.ready) {
		expect(reveal.changeLabels).toEqual(['Change the photos']);
		expect(reveal.priorDirectionName).toBe(selected?.direction.name);
		expect(JSON.stringify(reveal)).not.toContain('CE6 Southline Inn');
	}
	const after = await getLatestDraftForTenant(north.ctx);
	expect(after?.document.identity.displayName).toBe(before?.document.identity.displayName);
	expect(await getPublishedHomeForTenant(north.ctx)).toBeNull();
	const approved = await decideClientReveal(
		north.actor,
		north.ctx,
		{ decision: 'approved' },
		'ce6-approve'
	);
	expect(approved.status).toBe('approved');
	expect(approved.revisionNote).toBeNull();
	const cleared = await getCreativeQaReviewForVersionForTenant(north.ctx, north.draft.draft.id);
	expect(cleared?.changeCategories).toBeNull();
	expect(cleared?.priorDirectionId).toBeNull();
	expect(await getPublishedHomeForTenant(north.ctx)).toBeNull();
});
