import { z } from 'zod';
import { CLIENT_GOAL_PERIODS, type ClientGoalType } from './schemas';

export const QUICKSTART_GOAL_CHOICES = [
	'qualified_leads',
	'bookings',
	'sales',
	'revenue',
	'subscriptions',
	'other'
] as const;
export type QuickStartGoalChoice = (typeof QUICKSTART_GOAL_CHOICES)[number];

export const QUICKSTART_GOOD_LEAD_CHOICES = [
	'inquiry',
	'fit',
	'booked',
	'ready_to_buy',
	'other'
] as const;
export type QuickStartGoodLeadChoice = (typeof QUICKSTART_GOOD_LEAD_CHOICES)[number];

export const QUICKSTART_AFTER_CONTACT_CHOICES = [
	'call',
	'book',
	'quote',
	'purchase_online',
	'other'
] as const;
export type QuickStartAfterContactChoice = (typeof QUICKSTART_AFTER_CONTACT_CHOICES)[number];

export const QUICKSTART_SALE_CHOICES = ['paid', 'booked', 'signed', 'other'] as const;
export type QuickStartSaleChoice = (typeof QUICKSTART_SALE_CHOICES)[number];

export const QUICKSTART_CRM_CHOICES = ['none', 'crm', 'booking', 'later'] as const;
export type QuickStartCrmChoice = (typeof QUICKSTART_CRM_CHOICES)[number];

export const QUICKSTART_APPROVER_CHOICES = ['self', 'other', 'later'] as const;
export type QuickStartApproverChoice = (typeof QUICKSTART_APPROVER_CHOICES)[number];

const optionalNote = z
	.string()
	.trim()
	.max(80)
	.optional()
	.nullable()
	.transform((value) => (value ? value : null));

export const saveOutcomesQuickStartSchema = z
	.object({
		goalChoice: z.enum(QUICKSTART_GOAL_CHOICES),
		goalOther: optionalNote,
		hasTarget: z.boolean(),
		targetValue: z.number().int().positive().max(1_000_000_000_000).optional().nullable(),
		period: z.enum(CLIENT_GOAL_PERIODS).optional().nullable(),
		currency: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/)
			.optional()
			.nullable(),
		goodLead: z.enum(QUICKSTART_GOOD_LEAD_CHOICES),
		goodLeadOther: optionalNote,
		afterContact: z.enum(QUICKSTART_AFTER_CONTACT_CHOICES),
		afterContactOther: optionalNote,
		sale: z.enum(QUICKSTART_SALE_CHOICES),
		saleOther: optionalNote,
		crm: z.enum(QUICKSTART_CRM_CHOICES),
		crmNote: optionalNote,
		notifyHighIntent: z.boolean(),
		approver: z.enum(QUICKSTART_APPROVER_CHOICES),
		approverNote: optionalNote
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.goalChoice === 'other' && !value.goalOther) {
			ctx.addIssue({
				code: 'custom',
				path: ['goalOther'],
				message: 'Describe the goal'
			});
		}
		if (value.hasTarget) {
			if (!value.targetValue) {
				ctx.addIssue({
					code: 'custom',
					path: ['targetValue'],
					message: 'Enter a whole-number target'
				});
			}
			if (!value.period) {
				ctx.addIssue({
					code: 'custom',
					path: ['period'],
					message: 'Choose a period'
				});
			}
			if (value.goalChoice === 'revenue' && !value.currency) {
				ctx.addIssue({
					code: 'custom',
					path: ['currency'],
					message: 'Revenue targets need a currency'
				});
			}
		}
		if (value.goodLead === 'other' && !value.goodLeadOther) {
			ctx.addIssue({
				code: 'custom',
				path: ['goodLeadOther'],
				message: 'Describe a good lead'
			});
		}
		if (value.afterContact === 'other' && !value.afterContactOther) {
			ctx.addIssue({
				code: 'custom',
				path: ['afterContactOther'],
				message: 'Describe what happens next'
			});
		}
		if (value.sale === 'other' && !value.saleOther) {
			ctx.addIssue({
				code: 'custom',
				path: ['saleOther'],
				message: 'Describe a sale'
			});
		}
		if (value.approver === 'other' && !value.approverNote) {
			ctx.addIssue({
				code: 'custom',
				path: ['approverNote'],
				message: 'Name who approves'
			});
		}
	});

export type SaveOutcomesQuickStartInput = z.infer<typeof saveOutcomesQuickStartSchema>;

export function mapQuickStartGoal(input: SaveOutcomesQuickStartInput): {
	goalType: ClientGoalType;
	name: string;
	unit: string;
} {
	if (input.goalChoice === 'subscriptions') {
		return { goalType: 'custom', name: 'Subscriptions', unit: 'subscriptions' };
	}
	if (input.goalChoice === 'other') {
		return {
			goalType: 'custom',
			name: input.goalOther ?? 'Custom goal',
			unit: 'units'
		};
	}
	const names: Record<Exclude<QuickStartGoalChoice, 'subscriptions' | 'other'>, string> = {
		qualified_leads: 'Qualified leads',
		bookings: 'Bookings',
		sales: 'Sales',
		revenue: 'Revenue'
	};
	const units: Record<Exclude<QuickStartGoalChoice, 'subscriptions' | 'other'>, string> = {
		qualified_leads: 'qualified leads',
		bookings: 'bookings',
		sales: 'sales',
		revenue: 'amount'
	};
	return {
		goalType: input.goalChoice,
		name: names[input.goalChoice],
		unit: input.goalChoice === 'revenue' ? (input.currency ?? 'amount') : units[input.goalChoice]
	};
}
