import type { ActorType } from '@vector/contracts';
import { insertAudit } from '@vector/db';

export async function recordAudit(input: {
	organizationId?: string | null;
	clientId?: string | null;
	actorType: ActorType;
	actorId?: string | null;
	action: string;
	entityType: string;
	entityId?: string | null;
	requestId: string;
	reason?: string;
}) {
	return insertAudit({
		organizationId: input.organizationId ?? null,
		clientId: input.clientId ?? null,
		actorType: input.actorType,
		actorId: input.actorId ?? null,
		action: input.action,
		entityType: input.entityType,
		entityId: input.entityId ?? null,
		requestId: input.requestId,
		reason: input.reason ?? null
	});
}
