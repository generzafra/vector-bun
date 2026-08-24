import { requireCapability } from '@vector/auth';
import {
	APPROVAL_CENTER_GROUPS,
	APPROVAL_CENTER_GROUP_COPY,
	ValidationError,
	approvalCenterGroupFor,
	assertActorOwnsContext,
	intelligenceClientIdSchema,
	parseContract,
	type ApprovalCenterGroup,
	type TenantContext
} from '@vector/contracts';
import {
	assertAiClient,
	getOutcomesQuickStartForTenant,
	listAiDecisionsForTenant,
	listApprovalRequestsForTenant
} from '@vector/db';
import type { Actor } from './auth-service';
import { decideIntelligenceApproval } from './intelligence';

export type ApprovalCenterItem = {
	id: string;
	clientId: string;
	actionType: string;
	group: ApprovalCenterGroup;
	summary: string;
	finding: string;
	evidence: string;
	proposedAction: string;
	expectedImpact: string;
	status: string;
	required: boolean;
};

export type ApprovalCenterGroupView = {
	key: ApprovalCenterGroup;
	label: string;
	empty: string;
	items: ApprovalCenterItem[];
};

export async function getApprovalCenter(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'ai.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(intelligenceClientIdSchema, { clientId });
		assertAiClient(required, clientId);
	}
	const [approvals, decisions, quickstart] = await Promise.all([
		listApprovalRequestsForTenant(required),
		listAiDecisionsForTenant(required),
		getOutcomesQuickStartForTenant(required)
	]);
	const canManage = actor.permissions.includes('ai.manage');
	const assignedToOther =
		!canManage &&
		Boolean(quickstart?.approverUserId) &&
		quickstart?.approverUserId !== actor.userId;
	const decisionById = new Map(decisions.map((row) => [row.id, row]));
	const pending = assignedToOther
		? []
		: approvals.filter((row) => row.status === 'pending' && row.clientId === required.clientId);
	const items: ApprovalCenterItem[] = pending.map((row) => {
		const decision = decisionById.get(row.decisionId);
		return {
			id: row.id,
			clientId: row.clientId,
			actionType: row.actionType,
			group: approvalCenterGroupFor(row.actionType),
			summary: row.summary,
			finding: decision?.finding ?? row.summary,
			evidence: decision?.evidence ?? 'No evidence recorded.',
			proposedAction: decision?.proposedAction ?? row.summary,
			expectedImpact: decision?.expectedImpact ?? 'Not estimated.',
			status: row.status,
			required: row.required
		};
	});
	const groups: ApprovalCenterGroupView[] = APPROVAL_CENTER_GROUPS.map((key) => ({
		key,
		label: APPROVAL_CENTER_GROUP_COPY[key].label,
		empty: APPROVAL_CENTER_GROUP_COPY[key].empty,
		items: items.filter((item) => item.group === key)
	}));
	return {
		assignedToOther,
		pendingCount: items.length,
		groups
	};
}

export async function decideApprovalCenterGroup(
	actor: Actor,
	ctx: TenantContext,
	input: { group: ApprovalCenterGroup; decision: 'approved' | 'rejected' },
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const center = await getApprovalCenter(actor, ctx);
	const group = center.groups.find((row) => row.key === input.group);
	if (!group || group.items.length === 0) {
		throw new ValidationError('Nothing in that group needs a decision');
	}
	const recorded = [];
	for (const item of group.items) {
		recorded.push(
			await decideIntelligenceApproval(
				actor,
				ctx,
				{ id: item.id, decision: input.decision, note: null },
				`${requestId}:${item.id}`
			)
		);
	}
	return { count: recorded.length, group: input.group, decision: input.decision };
}
