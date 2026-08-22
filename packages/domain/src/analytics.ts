import { requireCapability } from '@vector/auth';
import {
	CONVERSION_STEPS,
	createAnalyticsProvider,
	type AnalyticsProvider
} from '@vector/analytics';
import { assertActorOwnsContext, type TenantContext } from '@vector/contracts';
import {
	assertLeadClient,
	countAnalyticsEventsForTenant,
	countLaunchTransitionsForTenant,
	countLeadsByAttributionForTenant,
	getLaunchForTenant
} from '@vector/db';
import type { Actor } from './auth-service';
import { launchTimingSplits } from './launch';

let analyticsProvider: AnalyticsProvider = createAnalyticsProvider();

export function setAnalyticsProvider(provider: AnalyticsProvider) {
	analyticsProvider = provider;
}

export function getAnalyticsProvider() {
	return analyticsProvider;
}

export function resetAnalyticsProvider() {
	analyticsProvider = createAnalyticsProvider();
}

const CONVERSION_NAMES = new Set<string>(CONVERSION_STEPS);

function rate(numerator: number, denominator: number) {
	if (denominator === 0) return null;
	return Math.round((numerator * 1000) / denominator) / 10;
}

function bucketCounts(
	rows: Array<{ name: string; isTest: boolean; total: number }>,
	isTest: boolean
) {
	const counts = Object.fromEntries(CONVERSION_STEPS.map((name) => [name, 0])) as Record<
		(typeof CONVERSION_STEPS)[number],
		number
	>;
	for (const row of rows) {
		if (row.isTest !== isTest) continue;
		if (!CONVERSION_NAMES.has(row.name)) continue;
		counts[row.name as (typeof CONVERSION_STEPS)[number]] += Number(row.total);
	}
	return counts;
}

function stepsFrom(counts: Record<(typeof CONVERSION_STEPS)[number], number>) {
	return CONVERSION_STEPS.map((name, index) => {
		const previous = index === 0 ? null : CONVERSION_STEPS[index - 1];
		return {
			name,
			count: counts[name],
			rateFromPrevious: previous ? rate(counts[name], counts[previous]) : null
		};
	});
}

export async function getAnalyticsReport(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'analytics.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertLeadClient(required, clientId);
	const [eventRows, sourceRows] = await Promise.all([
		countAnalyticsEventsForTenant(required),
		countLeadsByAttributionForTenant(required)
	]);
	const production = bucketCounts(eventRows, false);
	const preview = bucketCounts(eventRows, true);
	const sources = sourceRows
		.filter((row) => !row.isTest)
		.map((row) => ({
			channel: row.channel ?? 'unknown',
			source: row.source,
			campaign: row.campaign,
			leads: Number(row.total)
		}));
	const previewSources = sourceRows
		.filter((row) => row.isTest)
		.map((row) => ({
			channel: row.channel ?? 'unknown',
			source: row.source,
			campaign: row.campaign,
			leads: Number(row.total)
		}));

	let launch: {
		status: string;
		timing: ReturnType<typeof launchTimingSplits>;
		transitions: Array<{ toStatus: string; count: number }>;
	} | null = null;
	if (actor.permissions.includes('launch.read')) {
		const [record, transitions] = await Promise.all([
			getLaunchForTenant(required),
			countLaunchTransitionsForTenant(required)
		]);
		if (record) {
			launch = {
				status: record.status,
				timing: launchTimingSplits(record),
				transitions: transitions.map((row) => ({
					toStatus: row.toStatus,
					count: Number(row.total)
				}))
			};
		}
	}

	return {
		sourceOfTruth: 'postgres' as const,
		provider: await analyticsProvider.health(),
		conversion: {
			production: {
				steps: stepsFrom(production),
				leads: production.lead_created
			},
			preview: {
				steps: stepsFrom(preview),
				leads: preview.lead_created
			},
			sources,
			previewSources
		},
		launch
	};
}
