import { desc, eq } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { askVectorTurns } from './schema';

export async function listAskVectorTurnsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			id: askVectorTurns.id,
			intent: askVectorTurns.intent,
			toolName: askVectorTurns.toolName,
			authorized: askVectorTurns.authorized,
			evidenceClass: askVectorTurns.evidenceClass,
			answer: askVectorTurns.answer,
			explanation: askVectorTurns.explanation,
			createdAt: askVectorTurns.createdAt
		})
		.from(askVectorTurns)
		.where(eq(askVectorTurns.clientId, required.clientId))
		.orderBy(desc(askVectorTurns.createdAt))
		.limit(20);
}

export async function insertAskVectorTurnForTenant(
	ctx: TenantContext,
	input: {
		intent: string;
		toolName: string;
		authorized: boolean;
		evidenceClass: string;
		answer: string;
		explanation: string | null;
		costMicros: number | null;
		askedBy: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(askVectorTurns)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			intent: input.intent,
			toolName: input.toolName,
			authorized: input.authorized,
			evidenceClass: input.evidenceClass,
			answer: input.answer.slice(0, 500),
			explanation: input.explanation,
			costMicros: input.costMicros,
			askedBy: input.askedBy
		})
		.returning({
			id: askVectorTurns.id,
			intent: askVectorTurns.intent,
			toolName: askVectorTurns.toolName,
			authorized: askVectorTurns.authorized,
			evidenceClass: askVectorTurns.evidenceClass,
			answer: askVectorTurns.answer,
			explanation: askVectorTurns.explanation,
			createdAt: askVectorTurns.createdAt
		});
	return row ?? null;
}
