import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	confirmBrandVisualProfile,
	contextFor,
	getBrandVisualProfile,
	saveBrandVisualProfile
} from '@vector/domain';

function formText(form: FormData, name: string) {
	return String(form.get(name) ?? '').trim();
}

function formFields(form: FormData) {
	const extra = formText(form, 'prohibitedExtra')
		.split(/[\n,]/)
		.map((value) => value.trim())
		.filter(Boolean);
	return {
		primaryLogoAssetId: formText(form, 'primaryLogoAssetId') || null,
		primaryColor: formText(form, 'primaryColor'),
		accentColor: formText(form, 'accentColor') || null,
		primaryFont: formText(form, 'primaryFont') || null,
		visualPersonality: formText(form, 'visualPersonality'),
		photographyDirection: formText(form, 'photographyDirection'),
		prohibitedStyles: [
			...form
				.getAll('prohibitedStyle')
				.map((value) => String(value).trim())
				.filter(Boolean),
			...extra
		]
	};
}

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { needsClient: true, review: null };
	if (!session.permissions.includes('knowledge.read')) {
		return { needsClient: false, review: null };
	}
	const ctx = contextFor(session, locals.requestId);
	return {
		needsClient: false,
		review: await getBrandVisualProfile(session, ctx)
	};
}

export const actions = {
	save: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a business on Overview first' });
		const form = await request.formData();
		try {
			await saveBrandVisualProfile(
				session,
				contextFor(session, locals.requestId),
				formFields(form),
				locals.requestId
			);
			return { ok: true, saved: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not save brand look' });
		}
	},
	confirm: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a business on Overview first' });
		const form = await request.formData();
		try {
			await confirmBrandVisualProfile(
				session,
				contextFor(session, locals.requestId),
				{
					...formFields(form),
					source: formText(form, 'source') === 'edited' ? 'edited' : undefined
				},
				locals.requestId
			);
			return { ok: true, confirmed: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not confirm brand look' });
		}
	}
};
