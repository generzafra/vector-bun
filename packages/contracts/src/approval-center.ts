export const APPROVAL_CENTER_GROUPS = [
	'campaigns',
	'content',
	'site_direction',
	'connections'
] as const;
export type ApprovalCenterGroup = (typeof APPROVAL_CENTER_GROUPS)[number];

export const APPROVAL_CENTER_GROUP_COPY: Record<
	ApprovalCenterGroup,
	{ label: string; empty: string }
> = {
	campaigns: {
		label: 'Campaigns',
		empty: 'No campaign items need you.'
	},
	content: {
		label: 'Content',
		empty: 'No content items need you.'
	},
	site_direction: {
		label: 'Site direction',
		empty: 'Site direction reviews will appear here when a first website is ready.'
	},
	connections: {
		label: 'Connections',
		empty: 'No connection items need you. An expired social login will show here.'
	}
};

export function approvalCenterGroupFor(actionType: string): ApprovalCenterGroup {
	const type = actionType.trim().toLowerCase();
	if (
		type.startsWith('email.') ||
		type === 'social.publish' ||
		type.startsWith('nurture.') ||
		type.startsWith('experiment.')
	) {
		return 'campaigns';
	}
	if (
		type.startsWith('domain.') ||
		type.startsWith('dns.') ||
		type.includes('oauth') ||
		type.includes('connect') ||
		type === 'launch.wire_tracking'
	) {
		return 'connections';
	}
	if (
		type.includes('first_reveal') ||
		type.includes('visual_direction') ||
		type.includes('site_direction') ||
		type.startsWith('launch.')
	) {
		return 'site_direction';
	}
	return 'content';
}
