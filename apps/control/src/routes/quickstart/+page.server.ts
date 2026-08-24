import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { contextFor, getOutcomesQuickStart, saveOutcomesQuickStart } from '@vector/domain';

function formText(form: FormData, name: string) {
	return String(form.get(name) ?? '').trim();
}

function formChoice(form: FormData, name: string) {
	const value = formText(form, name);
	return value || undefined;
}

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { needsClient: true, quickstart: null };
	if (!session.permissions.includes('goals.read')) {
		return { needsClient: false, quickstart: null };
	}
	const ctx = contextFor(session, locals.requestId);
	return {
		needsClient: false,
		quickstart: await getOutcomesQuickStart(session, ctx)
	};
}

export const actions = {
	save: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a business on Overview first' });
		const form = await request.formData();
		const targetRaw = formText(form, 'targetValue');
		try {
			await saveOutcomesQuickStart(
				session,
				contextFor(session, locals.requestId),
				{
					goalChoice: formChoice(form, 'goalChoice'),
					goalOther: formText(form, 'goalOther') || null,
					hasTarget: formText(form, 'hasTarget') === 'yes',
					targetValue: targetRaw ? Number(targetRaw) : null,
					period: formChoice(form, 'period') ?? null,
					currency: formText(form, 'currency') || null,
					goodLead: formChoice(form, 'goodLead'),
					goodLeadOther: formText(form, 'goodLeadOther') || null,
					afterContact: formChoice(form, 'afterContact'),
					afterContactOther: formText(form, 'afterContactOther') || null,
					sale: formChoice(form, 'sale'),
					saleOther: formText(form, 'saleOther') || null,
					crm: formChoice(form, 'crm'),
					crmNote: formText(form, 'crmNote') || null,
					notifyHighIntent: formText(form, 'notifyHighIntent') === 'yes',
					approver: formChoice(form, 'approver'),
					approverNote: formText(form, 'approverNote') || null
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not save those answers' });
		}
	}
};
