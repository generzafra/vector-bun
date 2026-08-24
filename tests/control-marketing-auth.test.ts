import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import { login, logout, resolveSession } from '@vector/domain';
import {
	CONTROL_OVERVIEW_PATH,
	isControlMarketingPath,
	isControlPublicPath
} from '../apps/control/src/lib/public-paths';

const root = join(import.meta.dir, '..');

test('Control homepage is Vector marketing and Overview stays a dashboard', () => {
	const home = readFileSync(join(root, 'apps/control/src/routes/+page.svelte'), 'utf8');
	const overview = readFileSync(
		join(root, 'apps/control/src/routes/overview/+page.svelte'),
		'utf8'
	);
	const layout = readFileSync(join(root, 'apps/control/src/routes/+layout.svelte'), 'utf8');
	const hooks = readFileSync(join(root, 'apps/control/src/hooks.server.ts'), 'utf8');
	expect(home).toContain('MarketingHomepage');
	expect(home).not.toContain('hasOperatorControlNav');
	expect(overview).toContain('title="Overview"');
	expect(layout).toContain('marketingShell');
	expect(layout).toContain('AppShell');
	expect(hooks).toContain('CONTROL_OVERVIEW_PATH');
	expect(hooks).toContain('isControlMarketingPath');
	expect(CONTROL_OVERVIEW_PATH).toBe('/overview');
	expect(isControlMarketingPath('/')).toBe(true);
	expect(isControlMarketingPath('/overview')).toBe(false);
	expect(isControlPublicPath('/')).toBe(true);
	expect(isControlPublicPath('/overview')).toBe(false);
	expect(
		existsSync(join(root, 'apps/control/src/lib/vector/marketing/MarketingHomepage.svelte'))
	).toBe(true);
	expect(
		existsSync(
			join(root, 'apps/delivery/src/lib/components/vector/marketing/MarketingHomepage.svelte')
		)
	).toBe(false);
});

test('marketing homepage does not invent proof metrics or paint Delivery', () => {
	const home = readFileSync(join(root, 'apps/control/src/routes/+page.svelte'), 'utf8');
	const hero = readFileSync(
		join(root, 'apps/control/src/lib/vector/marketing/VectorHero.svelte'),
		'utf8'
	);
	const proof = readFileSync(
		join(root, 'apps/control/src/lib/vector/marketing/ProofSection.svelte'),
		'utf8'
	);
	const metric = readFileSync(
		join(root, 'apps/control/src/lib/vector/marketing/HeroOutcomeMetric.svelte'),
		'utf8'
	);
	const deliveryPage = readFileSync(join(root, 'apps/delivery/src/routes/+page.svelte'), 'utf8');
	expect(home).toContain('href="/login"');
	expect(hero).toContain('href="/login"');
	expect(hero).not.toContain('TRUSTED BY');
	expect(proof).toContain('Not a scored audit');
	expect(proof).not.toContain('61/100');
	expect(proof).not.toContain('setTimeout');
	expect(metric).not.toContain('+31.42%');
	expect(metric).not.toContain('REVENUE');
	expect(deliveryPage).not.toContain('MarketingHomepage');
	expect(deliveryPage).toContain('PageRenderer');
});

test('logout destroys the session so the token cannot be reused', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.0.91'
	);
	expect(await resolveSession(session.token)).not.toBeNull();
	await logout(session.token, session);
	expect(await resolveSession(session.token)).toBeNull();
});

test('Control logout route posts CSRF and does not log out on GET', () => {
	const route = readFileSync(join(root, 'apps/control/src/routes/logout/+server.ts'), 'utf8');
	const shell = readFileSync(join(root, 'apps/control/src/lib/vector/AppShell.svelte'), 'utf8');
	const loginPage = readFileSync(
		join(root, 'apps/control/src/routes/login/+page.server.ts'),
		'utf8'
	);
	const getBlock = route.slice(
		route.indexOf('export const GET'),
		route.indexOf('export const POST')
	);
	expect(getBlock).not.toContain('logout(');
	expect(route).toContain('await logout');
	expect(shell).toContain('name="_csrf"');
	expect(shell).toContain('action="/logout"');
	expect(loginPage).toContain("redirect(303, '/overview')");
});
