export const PHASE_8_MAX_AUTONOMY = 3;
export const PHASE_4_MAX_AUTONOMY = 2;

export const AUTONOMY_ACTION_TYPES = [
	'internal_weekly_report',
	'apply_approved_metadata',
	'nurture.enroll_approved_sequence',
	'launch.queue_qa',
	'launch.wire_tracking',
	'launch.generate_drafts',
	'experiment.promote_winner',
	'page.publish',
	'email.send',
	'social.publish',
	'domain.activate',
	'dns.change',
	'legal.reply',
	'refund.issue',
	'pricing.change',
	'data.destroy',
	'ads.spend'
] as const;
export type AutonomyActionType = (typeof AUTONOMY_ACTION_TYPES)[number];

export const AUTONOMY_RISK_CLASSES = ['low', 'content', 'financial', 'legal'] as const;
export type AutonomyRiskClass = (typeof AUTONOMY_RISK_CLASSES)[number];

export const FORBIDDEN_AUTONOMY_ACTIONS = [
	'domain.activate',
	'dns.change',
	'legal.reply',
	'refund.issue',
	'pricing.change',
	'data.destroy',
	'ads.spend'
] as const;
export type ForbiddenAutonomyAction = (typeof FORBIDDEN_AUTONOMY_ACTIONS)[number];

export const NEVER_AUTO_EXECUTE_ACTIONS = [
	...FORBIDDEN_AUTONOMY_ACTIONS,
	'page.publish',
	'email.send',
	'social.publish',
	'experiment.promote_winner',
	'launch.generate_drafts'
] as const;

export const LOW_RISK_AUTO_EXECUTE_ACTIONS = [
	'internal_weekly_report',
	'apply_approved_metadata',
	'nurture.enroll_approved_sequence',
	'launch.queue_qa',
	'launch.wire_tracking'
] as const;

export type DefaultActionPolicy = {
	actionType: AutonomyActionType;
	name: string;
	description: string;
	riskClass: AutonomyRiskClass;
	defaultAutonomy: number;
	maxAutonomy: number;
	autoExecuteAllowed: boolean;
	forbidden: boolean;
	financialLimitMinor: number;
	contentLimit: string;
	providerLimit: string;
	approvalExpirySeconds: number | null;
	rollbackSupported: boolean;
};

export const DEFAULT_ACTION_POLICIES: DefaultActionPolicy[] = [
	{
		actionType: 'internal_weekly_report',
		name: 'Internal weekly report',
		description: 'Generate an internal performance summary. Does not send or publish.',
		riskClass: 'low',
		defaultAutonomy: 3,
		maxAutonomy: 3,
		autoExecuteAllowed: true,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'internal_only',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: 86_400,
		rollbackSupported: false
	},
	{
		actionType: 'apply_approved_metadata',
		name: 'Apply approved metadata',
		description: 'Apply already-approved metadata corrections on unpublished drafts.',
		riskClass: 'low',
		defaultAutonomy: 3,
		maxAutonomy: 3,
		autoExecuteAllowed: true,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'approved_copy_only',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: 86_400,
		rollbackSupported: true
	},
	{
		actionType: 'nurture.enroll_approved_sequence',
		name: 'Enroll in approved nurture',
		description: 'Add an eligible lead to an already approved welcome sequence.',
		riskClass: 'low',
		defaultAutonomy: 3,
		maxAutonomy: 3,
		autoExecuteAllowed: true,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'approved_copy_only',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: 86_400,
		rollbackSupported: false
	},
	{
		actionType: 'launch.queue_qa',
		name: 'Queue launch QA',
		description: 'Queue the standard launch QA checklist. Does not go live.',
		riskClass: 'low',
		defaultAutonomy: 3,
		maxAutonomy: 3,
		autoExecuteAllowed: true,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'internal_only',
		providerLimit: 'no_provider_call',
		approvalExpirySeconds: 86_400,
		rollbackSupported: false
	},
	{
		actionType: 'launch.wire_tracking',
		name: 'Wire launch tracking',
		description: 'Attach standard conversion events on a draft. Does not publish.',
		riskClass: 'low',
		defaultAutonomy: 3,
		maxAutonomy: 3,
		autoExecuteAllowed: true,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'none',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: 86_400,
		rollbackSupported: true
	},
	{
		actionType: 'launch.generate_drafts',
		name: 'Generate launch drafts',
		description: 'Create unpublished funnel drafts. Execution stays later and unpublished.',
		riskClass: 'content',
		defaultAutonomy: 1,
		maxAutonomy: 2,
		autoExecuteAllowed: false,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'approved_copy_only',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: null,
		rollbackSupported: false
	},
	{
		actionType: 'experiment.promote_winner',
		name: 'Promote experiment winner',
		description: 'Level 4 later. Phase 7 policy still decides. Not auto-execute in S0.',
		riskClass: 'content',
		defaultAutonomy: 2,
		maxAutonomy: 2,
		autoExecuteAllowed: false,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'approved_copy_only',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: null,
		rollbackSupported: true
	},
	{
		actionType: 'page.publish',
		name: 'Publish page',
		description: 'Publication stays a Funnel action.',
		riskClass: 'content',
		defaultAutonomy: 0,
		maxAutonomy: 2,
		autoExecuteAllowed: false,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'approved_copy_only',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: null,
		rollbackSupported: true
	},
	{
		actionType: 'email.send',
		name: 'Send email',
		description: 'Outbound email is never auto-executed from this catalog.',
		riskClass: 'content',
		defaultAutonomy: 1,
		maxAutonomy: 2,
		autoExecuteAllowed: false,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'approved_copy_only',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: null,
		rollbackSupported: false
	},
	{
		actionType: 'social.publish',
		name: 'Publish social',
		description: 'Social publish stays an approved, human-started workflow.',
		riskClass: 'content',
		defaultAutonomy: 1,
		maxAutonomy: 2,
		autoExecuteAllowed: false,
		forbidden: false,
		financialLimitMinor: 0,
		contentLimit: 'approved_copy_only',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: null,
		rollbackSupported: false
	},
	{
		actionType: 'domain.activate',
		name: 'Activate domain',
		description: 'Domain activation is forbidden from auto-execute.',
		riskClass: 'legal',
		defaultAutonomy: 0,
		maxAutonomy: 0,
		autoExecuteAllowed: false,
		forbidden: true,
		financialLimitMinor: 0,
		contentLimit: 'none',
		providerLimit: 'no_provider_call',
		approvalExpirySeconds: null,
		rollbackSupported: false
	},
	{
		actionType: 'dns.change',
		name: 'Change DNS',
		description: 'DNS changes are forbidden from auto-execute.',
		riskClass: 'legal',
		defaultAutonomy: 0,
		maxAutonomy: 0,
		autoExecuteAllowed: false,
		forbidden: true,
		financialLimitMinor: 0,
		contentLimit: 'none',
		providerLimit: 'no_provider_call',
		approvalExpirySeconds: null,
		rollbackSupported: false
	},
	{
		actionType: 'legal.reply',
		name: 'Legal reply',
		description: 'Legal replies stay human-reviewed.',
		riskClass: 'legal',
		defaultAutonomy: 0,
		maxAutonomy: 0,
		autoExecuteAllowed: false,
		forbidden: true,
		financialLimitMinor: 0,
		contentLimit: 'none',
		providerLimit: 'no_external_send',
		approvalExpirySeconds: null,
		rollbackSupported: false
	},
	{
		actionType: 'refund.issue',
		name: 'Issue refund',
		description: 'Refunds are forbidden from auto-execute.',
		riskClass: 'financial',
		defaultAutonomy: 0,
		maxAutonomy: 0,
		autoExecuteAllowed: false,
		forbidden: true,
		financialLimitMinor: 0,
		contentLimit: 'none',
		providerLimit: 'no_provider_call',
		approvalExpirySeconds: null,
		rollbackSupported: false
	},
	{
		actionType: 'pricing.change',
		name: 'Change pricing',
		description: 'Material pricing changes stay human-controlled.',
		riskClass: 'financial',
		defaultAutonomy: 0,
		maxAutonomy: 0,
		autoExecuteAllowed: false,
		forbidden: true,
		financialLimitMinor: 0,
		contentLimit: 'none',
		providerLimit: 'no_provider_call',
		approvalExpirySeconds: null,
		rollbackSupported: false
	},
	{
		actionType: 'data.destroy',
		name: 'Destroy data',
		description: 'Destructive data operations are forbidden from auto-execute.',
		riskClass: 'legal',
		defaultAutonomy: 0,
		maxAutonomy: 0,
		autoExecuteAllowed: false,
		forbidden: true,
		financialLimitMinor: 0,
		contentLimit: 'none',
		providerLimit: 'no_provider_call',
		approvalExpirySeconds: null,
		rollbackSupported: false
	},
	{
		actionType: 'ads.spend',
		name: 'Ad spend',
		description: 'Unrestricted ad spend is out of scope. This class cannot auto-execute.',
		riskClass: 'financial',
		defaultAutonomy: 0,
		maxAutonomy: 0,
		autoExecuteAllowed: false,
		forbidden: true,
		financialLimitMinor: 0,
		contentLimit: 'none',
		providerLimit: 'no_provider_call',
		approvalExpirySeconds: null,
		rollbackSupported: false
	}
];
