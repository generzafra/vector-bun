import { requireCapability } from '@vector/auth';
import {
	assertActorOwnsContext,
	goalsClientIdSchema,
	parseContract,
	type TenantContext
} from '@vector/contracts';
import { assertGoalClient, getClientSettingsForTenant, getTodayFactsForTenant } from '@vector/db';
import type { Actor } from './auth-service';
import { evaluateDataHealth } from './outcomes';
import { summarizeRecordedRevenue } from './revenue';

export const TODAY_HIGH_INTENT_MIN_SCORE = 50;

type TodayCount = {
	evidenceClass: 'observed' | 'unknown';
	count: number | null;
	detail: string;
};

type TodayItem = { id: string; detail: string };

type ZonedParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

function zonedParts(timeZone: string, instant: Date): ZonedParts {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(instant);
	const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
	return {
		year: read('year'),
		month: read('month'),
		day: read('day'),
		hour: read('hour'),
		minute: read('minute'),
		second: read('second')
	};
}

function startOfCivilDay(timeZone: string, year: number, month: number, day: number) {
	const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
	const atGuess = zonedParts(timeZone, guess);
	const offset =
		Date.UTC(
			atGuess.year,
			atGuess.month - 1,
			atGuess.day,
			atGuess.hour,
			atGuess.minute,
			atGuess.second
		) - guess.getTime();
	return new Date(guess.getTime() - offset);
}

function startOfZonedDay(timeZone: string, instant: Date) {
	const shown = zonedParts(timeZone, instant);
	return startOfCivilDay(timeZone, shown.year, shown.month, shown.day);
}

function zoneOrUtc(timeZone: string) {
	const zone = timeZone || 'UTC';
	try {
		Intl.DateTimeFormat('en-GB', { timeZone: zone });
		return zone;
	} catch {
		return 'UTC';
	}
}

export function clientDayWindow(timeZone: string, now = new Date()) {
	const zone = zoneOrUtc(timeZone);
	const start = startOfZonedDay(zone, now);
	const end = startOfZonedDay(zone, new Date(start.getTime() + 36 * 60 * 60 * 1000));
	const previousStart = startOfZonedDay(zone, new Date(start.getTime() - 60 * 60 * 1000));
	const label = new Intl.DateTimeFormat('en-GB', {
		timeZone: zone,
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(now);
	return { start, end, previousStart, timeZone: zone, label };
}

export function previousCompletedMonth(timeZone: string, now = new Date()) {
	const zone = zoneOrUtc(timeZone);
	const shown = zonedParts(zone, now);
	const end = startOfCivilDay(zone, shown.year, shown.month, 1);
	const previous =
		shown.month === 1
			? { year: shown.year - 1, month: 12 }
			: { year: shown.year, month: shown.month - 1 };
	const start = startOfCivilDay(zone, previous.year, previous.month, 1);
	const periodKey = `${previous.year}-${String(previous.month).padStart(2, '0')}`;
	const label = new Intl.DateTimeFormat('en-GB', {
		timeZone: zone,
		month: 'long',
		year: 'numeric'
	}).format(start);
	return { periodKey, label, start, end, timeZone: zone };
}

function observed(count: number, detail: string): TodayCount {
	return { evidenceClass: 'observed', count, detail };
}

function unknown(detail: string): TodayCount {
	return { evidenceClass: 'unknown', count: null, detail };
}

function plural(count: number, singular: string, pluralForm: string) {
	return count === 1 ? singular : pluralForm;
}

export async function getClientToday(actor: Actor, ctx: TenantContext, clientId?: string) {
	const canLeads = actor.permissions.includes('leads.read');
	const canGoals = actor.permissions.includes('goals.read');
	const canApprovals = actor.permissions.includes('ai.read');
	const canEmail = actor.permissions.includes('email.read');
	const canSocial = actor.permissions.includes('social.read');
	const canOutcomes = actor.permissions.includes('outcomes.read');
	if (!canLeads && !canGoals && !canApprovals && !canEmail && !canSocial) {
		requireCapability(actor.permissions, 'leads.read');
	}
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(goalsClientIdSchema, { clientId });
		assertGoalClient(required, clientId);
	}
	const settings = await getClientSettingsForTenant(required);
	const day = clientDayWindow(settings?.timezone ?? 'UTC');
	const facts =
		canLeads || canApprovals || canEmail || canSocial
			? await getTodayFactsForTenant(required, day, TODAY_HIGH_INTENT_MIN_SCORE)
			: null;
	const health = canGoals ? await evaluateDataHealth(actor, required) : [];
	const warnings = canGoals
		? health
				.filter((row) => row.status === 'warning' || row.status === 'broken')
				.map((row) => ({ id: row.checkKey, detail: row.detail }))
		: [];

	const newLeads =
		!facts || !canLeads
			? unknown('New leads need lead access.')
			: observed(
					facts.newLeads,
					facts.newLeads === 0
						? 'No new leads recorded today.'
						: `${facts.newLeads} new ${plural(facts.newLeads, 'lead', 'leads')} recorded today.`
				);
	const highIntent =
		!facts || !canLeads
			? unknown('High-intent leads need lead access.')
			: observed(
					facts.highIntentLeads,
					facts.highIntentLeads === 0
						? 'No high-intent leads recorded today.'
						: `${facts.highIntentLeads} high-intent ${plural(facts.highIntentLeads, 'lead', 'leads')} recorded today.`
				);
	const sales =
		!facts || !canLeads
			? unknown('Sales need lead access.')
			: observed(
					facts.sales,
					facts.sales === 0
						? 'No sales recorded today.'
						: `${facts.sales} ${plural(facts.sales, 'sale', 'sales')} recorded today.`
				);

	const needsYouItems: TodayItem[] = [
		...(canApprovals && facts
			? facts.pendingApprovals.map((row) => ({ id: row.id, detail: row.summary }))
			: []),
		...warnings
	];
	const needsYou =
		!canApprovals && !canGoals
			? {
					evidenceClass: 'unknown' as const,
					items: [] as TodayItem[],
					detail: 'What needs you requires approval or goal access.'
				}
			: {
					evidenceClass: 'observed' as const,
					items: needsYouItems,
					detail:
						needsYouItems.length === 0
							? 'Nothing is waiting on you.'
							: canApprovals && facts && facts.pendingApprovalCount > facts.pendingApprovals.length
								? `${facts.pendingApprovalCount} approvals are waiting.`
								: 'These items need you.'
				};

	const handledItems: TodayItem[] = [];
	if (canEmail && facts) {
		handledItems.push({
			id: 'nurture',
			detail:
				facts.nurtureSent === 0
					? 'No nurture messages sent today.'
					: `Sent ${facts.nurtureSent} nurture ${plural(facts.nurtureSent, 'message', 'messages')}.`
		});
	}
	if (canSocial && facts) {
		handledItems.push({
			id: 'posts',
			detail:
				facts.postsPublished === 0
					? 'No social posts published today.'
					: `Published ${facts.postsPublished} social ${plural(facts.postsPublished, 'post', 'posts')}.`
		});
	}
	const handled =
		handledItems.length === 0
			? {
					evidenceClass: 'unknown' as const,
					items: handledItems,
					detail: 'What Vector handled needs email or social access.'
				}
			: { evidenceClass: 'observed' as const, items: handledItems, detail: 'Observed work today.' };

	const changes =
		!facts || !canLeads
			? unknown('Lead changes need lead access.')
			: observed(
					facts.newLeads,
					`${facts.newLeads} new ${plural(facts.newLeads, 'lead', 'leads')} today. ${facts.newLeadsYesterday} yesterday.`
				);

	const revenue = canOutcomes
		? await summarizeRecordedRevenue(required, day, 'No revenue recorded today.')
		: {
				evidenceClass: 'unknown' as const,
				amountMinor: null,
				currency: null,
				count: null,
				detail: 'Revenue needs access.'
			};

	return {
		label: day.label,
		timeZone: day.timeZone,
		newLeads,
		highIntent,
		sales,
		revenue,
		needsYou,
		handled,
		changes
	};
}
