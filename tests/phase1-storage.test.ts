import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import { brandAssets, clients, db, listBrandAssetsForTenant } from '@vector/db';
import {
	contextFor,
	getKnowledge,
	login,
	recalculateReadiness,
	removeBrandAsset,
	resolveSession,
	switchActiveClient,
	uploadBrandAsset
} from '@vector/domain';
import {
	LocalStorageProvider,
	assertTenantStorageKey,
	buildStorageKey,
	inspectUpload
} from '@vector/storage';
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

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

test('missing TenantContext cannot read brand assets', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listBrandAssetsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('storage keys stay inside the requesting tenant prefix', () => {
	const alpha = '11111111-1111-4111-8111-111111111111';
	const beta = '22222222-2222-4222-8222-222222222222';
	const key = buildStorageKey(alpha, 'brand', 'logo', 'logo.PNG');
	expect(key.startsWith(`clients/${alpha}/brand/`)).toBe(true);
	expect(key.includes(beta)).toBe(false);
	expect(() => assertTenantStorageKey(beta, key)).toThrow(ForbiddenError);
	expect(() => assertTenantStorageKey(alpha, `clients/${alpha}/../${beta}/secret`)).toThrow(
		ForbiddenError
	);
});

test('uploads reject size, MIME, and magic-byte mismatches', () => {
	expect(() =>
		inspectUpload({ filename: 'logo.png', declaredType: 'image/png', bytes: new Uint8Array() })
	).toThrow(ValidationError);
	expect(() =>
		inspectUpload({
			filename: 'logo.png',
			declaredType: 'image/png',
			bytes: new Uint8Array(2 * 1024 * 1024 + 1)
		})
	).toThrow(ValidationError);
	expect(() =>
		inspectUpload({ filename: 'logo.svg', declaredType: 'image/svg+xml', bytes: PNG_1X1 })
	).toThrow(ValidationError);
	expect(() =>
		inspectUpload({
			filename: 'logo.png',
			declaredType: 'image/png',
			bytes: new Uint8Array([0xff, 0xd8, 0xff])
		})
	).toThrow(ValidationError);
	expect(
		inspectUpload({ filename: 'logo.png', declaredType: 'image/png', bytes: PNG_1X1 }).mime
	).toBe('image/png');
});

test('local adapter refuses a key from another tenant', async () => {
	const alpha = '11111111-1111-4111-8111-111111111111';
	const beta = '22222222-2222-4222-8222-222222222222';
	const store = new LocalStorageProvider(`${env.STORAGE_LOCAL_DIR}/adapter-test`);
	const key = buildStorageKey(alpha, 'brand', 'logo', 'logo.png');
	await store.putObject({ clientId: alpha, key, bytes: PNG_1X1, contentType: 'image/png' });
	await expect(store.getObject(beta, key)).rejects.toBeInstanceOf(ForbiddenError);
	const own = await store.getObject(alpha, key);
	expect(own.bytes.byteLength).toBe(PNG_1X1.byteLength);
});

test('user on client A cannot upload or read client B assets', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.70'
	);
	const ctx = contextFor(session, 'asset-read');
	expect(ctx.clientId).toBe(alpha.id);
	const uploaded = await uploadBrandAsset(
		session,
		ctx,
		{
			purpose: 'logo',
			filename: 'alpha-logo.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'asset-upload'
	);
	expect(uploaded.storageKey.startsWith(`clients/${alpha.id}/brand/`)).toBe(true);
	expect(uploaded.storageKey).not.toContain(beta.id);
	const own = await getKnowledge(session, ctx);
	expect(own.assets.some((asset) => asset.id === uploaded.id)).toBe(true);
	expect(JSON.stringify(own.assets)).not.toContain('storageKey');
	expect(JSON.stringify(own.assets)).not.toContain(beta.id);

	await expect(getKnowledge(session, ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		uploadBrandAsset(
			session,
			{ ...ctx, clientId: beta.id },
			{
				purpose: 'logo',
				filename: 'hijack.png',
				declaredType: 'image/png',
				bytes: PNG_1X1
			},
			'asset-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('route asset id cannot leak the other tenant file through the API', async () => {
	const { beta } = await seededClients();
	const admin = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.0.70'
	);
	await switchActiveClient(admin.session, admin.session.token, beta.id, 'asset-beta-switch');
	const betaActor = await resolveSession(admin.session.token);
	if (!betaActor) throw new Error('beta session missing');
	const uploaded = await uploadBrandAsset(
		betaActor,
		contextFor(betaActor, 'asset-beta'),
		{
			purpose: 'logo',
			filename: 'beta-warehouse.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'asset-beta'
	);

	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/knowledge/assets/${uploaded.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta-warehouse');
	expect(text.toLowerCase()).not.toContain('warehouse');
});

test('missing knowledge.manage cannot upload assets', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.71'
	);
	const ctx = contextFor(session, 'asset-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'knowledge.manage')
	};
	await expect(
		uploadBrandAsset(
			actor,
			ctx,
			{
				purpose: 'logo',
				filename: 'blocked.png',
				declaredType: 'image/png',
				bytes: PNG_1X1
			},
			'asset-cap'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('uploaded brand asset marks assets.uploaded for that tenant only', async () => {
	const { alpha, beta } = await seededClients();
	const admin = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.0.71'
	);
	await switchActiveClient(admin.session, admin.session.token, alpha.id, 'asset-ready-switch');
	const actor = await resolveSession(admin.session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'asset-ready');
	await uploadBrandAsset(
		actor,
		ctx,
		{
			purpose: 'logo',
			filename: 'alpha-ready.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'asset-ready'
	);
	const ready = await recalculateReadiness(actor, ctx, 'asset-ready');
	expect(ready.items.find((item) => item.key === 'assets.uploaded')?.status).toBe('complete');
	expect(ready.launch.clientId).toBe(alpha.id);
	expect(ready.launch.clientId).not.toBe(beta.id);

	await switchActiveClient(actor, actor.token, beta.id, 'asset-beta-ready');
	const betaActor = await resolveSession(actor.token);
	if (!betaActor) throw new Error('beta session missing');
	const betaState = await recalculateReadiness(
		betaActor,
		contextFor(betaActor, 'asset-beta-ready'),
		'asset-beta-ready'
	);
	expect(betaState.launch.clientId).toBe(beta.id);
	const betaAssets = await listBrandAssetsForTenant(contextFor(betaActor, 'asset-beta-list'));
	if (betaAssets.length === 0) {
		expect(betaState.items.find((item) => item.key === 'assets.uploaded')?.status).toBe('pending');
	}
});

test('delete removes only the active client asset', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.72'
	);
	const ctx = contextFor(session, 'asset-del');
	const uploaded = await uploadBrandAsset(
		session,
		ctx,
		{
			purpose: 'mark',
			filename: 'alpha-mark.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'asset-del'
	);
	await removeBrandAsset(session, ctx, uploaded.id, 'asset-del');
	const leftover = await db.select().from(brandAssets).where(eq(brandAssets.id, uploaded.id));
	expect(leftover.length).toBe(0);
});
