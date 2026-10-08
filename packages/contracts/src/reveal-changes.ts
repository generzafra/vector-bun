import { ValidationError } from './errors';

export const REVEAL_CHANGE_CATEGORIES = [
	{ id: 'headline', label: 'Make the headline clearer' },
	{ id: 'photos', label: 'Change the photos' },
	{ id: 'colors', label: 'Adjust the colors' },
	{ id: 'length', label: 'Shorten the page' },
	{ id: 'offer', label: 'Change the offer' },
	{ id: 'other', label: 'Something else' }
] as const;

export type RevealChangeCategory = (typeof REVEAL_CHANGE_CATEGORIES)[number]['id'];

const CATEGORY_IDS = new Set<string>(REVEAL_CHANGE_CATEGORIES.map((item) => item.id));

export function parseRevealChangeCategories(value: unknown): RevealChangeCategory[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new ValidationError('Choose what should change');
	}
	const unique: RevealChangeCategory[] = [];
	for (const item of value) {
		if (typeof item !== 'string' || !CATEGORY_IDS.has(item)) {
			throw new ValidationError('Choose a listed change');
		}
		const category = item as RevealChangeCategory;
		if (!unique.includes(category)) unique.push(category);
	}
	return unique;
}

export function revealChangeLabel(id: string) {
	return REVEAL_CHANGE_CATEGORIES.find((item) => item.id === id)?.label ?? null;
}
