import { vectorLegalEntity } from '$lib/legal/entity';
import { parseLegalMarkdown } from '$lib/legal/parse';
import { termsOfUseMarkdown } from '$lib/legal/sources';

export function load() {
	return {
		document: parseLegalMarkdown(termsOfUseMarkdown, vectorLegalEntity, {
			kind: 'terms',
			title: 'Terms of Use'
		})
	};
}
