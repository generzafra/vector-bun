import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import {
	CLIENT_DEFAULT_NAV_LABELS,
	OPERATOR_ONLY_NAV_LABELS,
	ROLE_CAPABILITIES,
	controlNavFor,
	hasOperatorControlNav
} from '@vector/contracts';
import { login } from '@vector/domain';

const root = join(import.meta.dir, '..');

function labelsFor(permissions: readonly string[]) {
	return controlNavFor(permissions).map((link) => link.label);
}

test('client-capability actors see the default shell without operator modules', () => {
	for (const role of ['client_owner', 'client_admin', 'read_only'] as const) {
		const labels = labelsFor(ROLE_CAPABILITIES[role]);
		expect(hasOperatorControlNav(ROLE_CAPABILITIES[role])).toBe(false);
		expect(labels).toEqual([...CLIENT_DEFAULT_NAV_LABELS]);
		for (const forbidden of OPERATOR_ONLY_NAV_LABELS) {
			expect(labels).not.toContain(forbidden);
		}
		expect(labels).not.toContain('Today');
		expect(labels).not.toContain('Campaigns');
		expect(labels).not.toContain('Insights');
	}
});

test('operator-capability actors keep the Control cockpit', () => {
	const labels = labelsFor(ROLE_CAPABILITIES.mge_operator);
	expect(hasOperatorControlNav(ROLE_CAPABILITIES.mge_operator)).toBe(true);
	expect(labels).toContain('Overview');
	expect(labels).toContain('Leads');
	expect(labels).toContain('Goals');
	expect(labels).toContain('Intelligence');
	expect(labels).not.toContain('Approvals');
	for (const required of ['Knowledge', 'Funnel', 'Autonomy', 'Portfolio'] as const) {
		expect(labels).toContain(required);
	}
	expect(labels).toEqual(labelsFor(ROLE_CAPABILITIES.mge_super_admin));
});

test('nav authorizes by capability, not role-string equality', () => {
	const salesLike = ['leads.read'] as const;
	expect(labelsFor(salesLike)).toEqual(['Overview', 'Leads']);

	const reviewerLike = ['ai.read'] as const;
	expect(labelsFor(reviewerLike)).toEqual(['Overview', 'Approvals']);
	expect(controlNavFor(reviewerLike).find((link) => link.label === 'Approvals')?.href).toBe(
		'/approvals'
	);
	expect(
		controlNavFor(ROLE_CAPABILITIES.mge_operator).find((link) => link.label === 'Intelligence')
			?.href
	).toBe('/intelligence');

	const expandedClient = [...ROLE_CAPABILITIES.client_owner, 'control.operator'];
	const expanded = labelsFor(expandedClient);
	expect(hasOperatorControlNav(expandedClient)).toBe(true);
	expect(expanded).toContain('Knowledge');
	expect(expanded).toContain('Autonomy');
	expect(expanded).toContain('Portfolio');
	expect(expanded).not.toContain('Approvals');

	const operatorWithoutKnowledge = ROLE_CAPABILITIES.mge_operator.filter(
		(cap) => cap !== 'knowledge.read'
	);
	expect(labelsFor(operatorWithoutKnowledge)).not.toContain('Knowledge');
	expect(labelsFor(operatorWithoutKnowledge)).toContain('Autonomy');
});

test('Control shell filters nav from capabilities instead of a hardcoded cockpit', () => {
	const shell = readFileSync(join(root, 'apps/control/src/lib/vector/AppShell.svelte'), 'utf8');
	const layout = readFileSync(join(root, 'apps/control/src/routes/+layout.svelte'), 'utf8');
	expect(shell).toContain('controlNavFor');
	expect(shell).toContain('permissions');
	expect(shell).not.toContain("href: '/autonomy'");
	expect(shell).not.toContain("href: '/knowledge'");
	expect(layout).toContain('permissions={data.permissions}');
});

test('client Overview, Leads, Goals, and Approvals copy stays business language', () => {
	const overview = readFileSync(join(root, 'apps/control/src/routes/+page.svelte'), 'utf8');
	const leads = readFileSync(join(root, 'apps/control/src/routes/leads/+page.svelte'), 'utf8');
	const goals = readFileSync(join(root, 'apps/control/src/routes/goals/+page.svelte'), 'utf8');
	const approvals = readFileSync(
		join(root, 'apps/control/src/routes/approvals/+page.svelte'),
		'utf8'
	);
	const intelligence = readFileSync(
		join(root, 'apps/control/src/routes/intelligence/+page.svelte'),
		'utf8'
	);
	expect(overview).toContain('hasOperatorControlNav');
	expect(overview).toContain(
		'Sales and qualified-lead summaries will appear here once they are recorded'
	);
	expect(overview).not.toContain('knowledge, funnel, or launch');
	expect(leads).toContain('People who asked to hear from you');
	expect(goals).toContain('The main target Vector is working toward');
	expect(approvals).toContain('Items that need your decision');
	expect(approvals).toContain('Nothing needs you right now');
	expect(intelligence).toContain('hasOperatorControlNav');
});

test('seeded client_admin does not receive operator nav; seeded admin does', async () => {
	const { session: clientSession } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.80'
	);
	expect(hasOperatorControlNav(clientSession.permissions)).toBe(false);
	expect(labelsFor(clientSession.permissions)).toEqual([...CLIENT_DEFAULT_NAV_LABELS]);
	expect(labelsFor(clientSession.permissions)).not.toContain('Knowledge');

	const { session: operatorSession } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'127.0.0.81'
	);
	expect(hasOperatorControlNav(operatorSession.permissions)).toBe(true);
	expect(labelsFor(operatorSession.permissions)).toContain('Autonomy');
	expect(labelsFor(operatorSession.permissions)).toContain('Portfolio');
	expect(labelsFor(operatorSession.permissions)).toContain('Knowledge');
});
