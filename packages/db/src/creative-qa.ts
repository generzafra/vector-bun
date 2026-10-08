import { and, eq } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { creativeQaReviews } from './schema';

export async function getCreativeQaReviewForVersionForTenant(
	ctx: TenantContext,
	pageVersionId: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(creativeQaReviews)
		.where(
			and(
				eq(creativeQaReviews.clientId, required.clientId),
				eq(creativeQaReviews.pageVersionId, pageVersionId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function upsertCreativeQaReviewForTenant(
	ctx: TenantContext,
	input: {
		pageVersionId: string;
		creativeAssetId: string | null;
		checks: { key: string; passed: boolean; detail: string }[];
		passed: boolean;
		summary: string;
		altText: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const now = new Date();
	const [row] = await db
		.insert(creativeQaReviews)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			pageVersionId: input.pageVersionId,
			creativeAssetId: input.creativeAssetId,
			checks: input.checks,
			passed: input.passed,
			status: input.passed ? 'pending' : 'blocked',
			summary: input.summary,
			altText: input.altText,
			revisionNote: null,
			changeCategories: null,
			priorDirectionId: null,
			decidedBy: null,
			decidedAt: null,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: [creativeQaReviews.clientId, creativeQaReviews.pageVersionId],
			set: {
				creativeAssetId: input.creativeAssetId,
				checks: input.checks,
				passed: input.passed,
				status: input.passed ? 'pending' : 'blocked',
				summary: input.summary,
				altText: input.altText,
				revisionNote: null,
				changeCategories: null,
				priorDirectionId: null,
				decidedBy: null,
				decidedAt: null,
				updatedAt: now
			}
		})
		.returning();
	return row;
}

export async function decideCreativeQaReviewForTenant(
	ctx: TenantContext,
	input: {
		pageVersionId: string;
		status: 'approved' | 'changes_requested';
		revisionNote: string | null;
		changeCategories: string[] | null;
		priorDirectionId: string | null;
		decidedBy: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(creativeQaReviews)
		.set({
			status: input.status,
			revisionNote: input.revisionNote,
			changeCategories: input.changeCategories,
			priorDirectionId: input.priorDirectionId,
			decidedBy: input.decidedBy,
			decidedAt: new Date(),
			updatedAt: new Date()
		})
		.where(
			and(
				eq(creativeQaReviews.clientId, required.clientId),
				eq(creativeQaReviews.pageVersionId, input.pageVersionId),
				eq(creativeQaReviews.passed, true)
			)
		)
		.returning();
	return row ?? null;
}
