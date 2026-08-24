import { vectorLegalEntity } from '$lib/legal/entity';
import { parseLegalMarkdown } from '$lib/legal/parse';
import { privacyPolicyMarkdown } from '$lib/legal/sources';

export function load() {
	return {
		document: parseLegalMarkdown(privacyPolicyMarkdown, vectorLegalEntity, {
			kind: 'privacy',
			title: 'Privacy Policy'
		})
	};
}
