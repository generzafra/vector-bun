import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { getPortfolioOverview, setTenantUsageLimit } from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	return { overview: await getPortfolioOverview(session, locals.requestId) };
}

export const actions = {
	limit: async ({ request, locals }) => {
		const session = locals.session!;
		const form = await request.formData();
		try {
			await setTenantUsageLimit(
				session,
				{
					clientId: String(form.get('clientId') ?? ''),
					resourceFamily: String(form.get('resourceFamily') ?? ''),
					hardLimit: Number(form.get('hardLimit') ?? ''),
					warningPercent: Number(form.get('warningPercent') || 80),
					reason: String(form.get('reason') ?? '')
				},
				locals.requestId
			);
			return {
				ok: true,
				notice:
					'Usage limit updated for that client. S0 still evaluates only and does not refuse callers.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update the usage limit' });
		}
	}
};
