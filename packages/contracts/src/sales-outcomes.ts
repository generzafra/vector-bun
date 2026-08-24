import { z } from 'zod';
import type { LeadStatus } from './schemas';

export const SALES_OUTCOME_TYPES = [
	'contacted',
	'qualified',
	'appointment',
	'proposal',
	'won',
	'lost'
] as const;
export type SalesOutcomeType = (typeof SALES_OUTCOME_TYPES)[number];

export const SALES_OUTCOME_KNOWN_TYPES = ['appointment', 'proposal', 'won', 'lost'] as const;
export type SalesOutcomeKnownType = (typeof SALES_OUTCOME_KNOWN_TYPES)[number];

export const SALES_OUTCOME_CAPTURE = [
	{ type: 'contacted', label: 'Contacted' },
	{ type: 'qualified', label: 'Qualified' },
	{ type: 'appointment', label: 'Appointment' },
	{ type: 'won', label: 'Won' },
	{ type: 'lost', label: 'Lost' }
] as const;

const optionalNote = z
	.string()
	.trim()
	.max(400)
	.optional()
	.nullable()
	.transform((value) => (value ? value : null));

export const recordSalesOutcomeSchema = z
	.object({
		leadId: z.string().uuid(),
		outcomeType: z.enum(SALES_OUTCOME_TYPES),
		amountMinor: z.number().int().nonnegative().max(1_000_000_000_000_000).optional().nullable(),
		currency: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/)
			.optional()
			.nullable(),
		note: optionalNote
	})
	.strict()
	.superRefine((value, ctx) => {
		const amount = value.amountMinor ?? null;
		const currency = value.currency ?? null;
		if (amount != null && value.outcomeType !== 'won') {
			ctx.addIssue({
				code: 'custom',
				path: ['amountMinor'],
				message: 'Amount is only allowed on a won outcome'
			});
		}
		if ((amount != null) !== (currency != null)) {
			ctx.addIssue({
				code: 'custom',
				path: amount != null ? ['currency'] : ['amountMinor'],
				message: 'Amount and currency must be set together'
			});
		}
	});

export const salesOutcomesClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export function leadStatusForSalesOutcome(
	outcomeType: SalesOutcomeType,
	current: LeadStatus
): LeadStatus | null {
	if (current === 'spam') return null;
	if (outcomeType === 'contacted') return current === 'new' ? 'working' : null;
	if (outcomeType === 'qualified') {
		return current === 'new' || current === 'working' ? 'qualified' : null;
	}
	if (outcomeType === 'appointment' || outcomeType === 'proposal') return null;
	if (outcomeType === 'won') return current === 'won' ? null : 'won';
	return current === 'lost' ? null : 'lost';
}

export function formatMinorUnits(minor: number, currency: string) {
	const sign = minor < 0 ? '-' : '';
	const abs = Math.abs(Math.trunc(minor));
	const whole = Math.trunc(abs / 100);
	const cents = String(abs % 100).padStart(2, '0');
	return `${sign}${currency} ${whole}.${cents}`;
}
