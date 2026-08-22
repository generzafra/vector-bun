import {
	ENROLL_ELIGIBLE_WORKFLOW,
	INBOUND_EMAIL_WORKFLOW,
	LEAD_CAPTURED_WORKFLOW,
	NURTURE_DUE_SWEEP_WORKFLOW,
	NURTURE_STEP_WORKFLOW,
	enrollEligibleInputSchema,
	inboundEmailInputSchema,
	leadCapturedInputSchema,
	nurtureDueSweepInputSchema,
	nurtureStepInputSchema,
	platformDueSweepInputSchema,
	registerWorkflowHandlers,
	workflowRuntime,
	type TenantWorkflowName,
	type WorkflowDispatchResult
} from '@vector/automation';
import { parseContract, requireTenantContext, type TenantContext } from '@vector/contracts';
import { listTenantsWithDueNurtureSteps } from '@vector/db';
import {
	enrollEligibleLeads,
	processDueNurtureSteps,
	processInboundEmailWorkflow,
	processLeadCapturedWorkflow,
	processNurtureStepWorkflow
} from './email';

let handlersRegistered = false;

function tenantFrom(input: {
	organizationId: string;
	clientId: string;
	requestId: string;
}): TenantContext {
	return {
		organizationId: input.organizationId,
		clientId: input.clientId,
		roleIds: [],
		requestId: input.requestId
	};
}

function hourWindow(now = new Date()) {
	return now.toISOString().slice(0, 13);
}

export function ensureWorkflowHandlers() {
	if (handlersRegistered) return;
	handlersRegistered = true;
	registerWorkflowHandlers({
		[LEAD_CAPTURED_WORKFLOW.name]: (payload) => processLeadCapturedWorkflow(payload),
		[NURTURE_STEP_WORKFLOW.name]: (payload) => processNurtureStepWorkflow(payload),
		[ENROLL_ELIGIBLE_WORKFLOW.name]: async (payload) => {
			const parsed = parseContract(enrollEligibleInputSchema, payload);
			return enrollEligibleLeads(tenantFrom(parsed));
		},
		[NURTURE_DUE_SWEEP_WORKFLOW.name]: async (payload) => {
			const parsed = parseContract(nurtureDueSweepInputSchema, payload);
			return processDueNurtureSteps(tenantFrom(parsed));
		},
		[INBOUND_EMAIL_WORKFLOW.name]: (payload) => processInboundEmailWorkflow(payload)
	});
}

function prepareTenantWorkflow(name: TenantWorkflowName, input: unknown) {
	switch (name) {
		case LEAD_CAPTURED_WORKFLOW.name: {
			const payload = parseContract(leadCapturedInputSchema, input);
			return {
				payload,
				organizationId: payload.organizationId,
				clientId: payload.clientId,
				requestId: payload.requestId,
				idempotencyKey: LEAD_CAPTURED_WORKFLOW.idempotencyKey(payload)
			};
		}
		case NURTURE_STEP_WORKFLOW.name: {
			const payload = parseContract(nurtureStepInputSchema, input);
			return {
				payload,
				organizationId: payload.organizationId,
				clientId: payload.clientId,
				requestId: payload.requestId,
				idempotencyKey: NURTURE_STEP_WORKFLOW.idempotencyKey(payload)
			};
		}
		case ENROLL_ELIGIBLE_WORKFLOW.name: {
			const payload = parseContract(enrollEligibleInputSchema, input);
			return {
				payload,
				organizationId: payload.organizationId,
				clientId: payload.clientId,
				requestId: payload.requestId,
				idempotencyKey: ENROLL_ELIGIBLE_WORKFLOW.idempotencyKey({
					clientId: payload.clientId,
					windowStart: hourWindow()
				})
			};
		}
		case NURTURE_DUE_SWEEP_WORKFLOW.name: {
			const payload = parseContract(nurtureDueSweepInputSchema, input);
			return {
				payload,
				organizationId: payload.organizationId,
				clientId: payload.clientId,
				requestId: payload.requestId,
				idempotencyKey: NURTURE_DUE_SWEEP_WORKFLOW.idempotencyKey({
					clientId: payload.clientId,
					windowStart: hourWindow()
				})
			};
		}
		case INBOUND_EMAIL_WORKFLOW.name: {
			const payload = parseContract(inboundEmailInputSchema, input);
			return {
				payload,
				organizationId: payload.organizationId,
				clientId: payload.clientId,
				requestId: payload.requestId,
				idempotencyKey: INBOUND_EMAIL_WORKFLOW.idempotencyKey(payload)
			};
		}
		default: {
			const exhausted: never = name;
			throw new Error(`Unsupported tenant workflow: ${exhausted}`);
		}
	}
}

export async function dispatchWorkflow(
	name: TenantWorkflowName,
	input: unknown
): Promise<WorkflowDispatchResult> {
	ensureWorkflowHandlers();
	const prepared = prepareTenantWorkflow(name, input);
	requireTenantContext({
		organizationId: prepared.organizationId,
		clientId: prepared.clientId,
		roleIds: [],
		requestId: prepared.requestId
	});
	return workflowRuntime().dispatch({
		name,
		payload: prepared.payload,
		idempotencyKey: prepared.idempotencyKey
	});
}

export async function processPlatformDueNurtureSweep(input: unknown, now = new Date()) {
	ensureWorkflowHandlers();
	const parsed = parseContract(platformDueSweepInputSchema, input);
	const tenants = await listTenantsWithDueNurtureSteps(now);
	const results = [];
	for (const tenant of tenants) {
		results.push({
			organizationId: tenant.organizationId,
			clientId: tenant.clientId,
			...(await dispatchWorkflow(NURTURE_DUE_SWEEP_WORKFLOW.name, {
				organizationId: tenant.organizationId,
				clientId: tenant.clientId,
				requestId: parsed.requestId
			}))
		});
	}
	return { tenants: tenants.length, results };
}

export { resetWorkflowRuntime, setWorkflowRuntime, workflowRuntime } from '@vector/automation';
