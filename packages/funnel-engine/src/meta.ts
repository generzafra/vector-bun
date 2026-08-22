export type PublicDomainKind = 'preview' | 'production' | 'redirect';

export type PublicPageMetaInput = {
	title: string;
	description: string;
	origin: string;
	domainKind: PublicDomainKind;
};

export type PublicPageMeta = {
	title: string;
	description: string;
	robots: 'noindex, nofollow' | 'index, follow';
	canonical: string | null;
};

export function publicPageMeta(input: PublicPageMetaInput): PublicPageMeta {
	const preview = input.domainKind === 'preview';
	const origin = input.origin.replace(/\/$/, '');
	return {
		title: input.title,
		description: input.description,
		robots: preview ? 'noindex, nofollow' : 'index, follow',
		canonical: preview ? null : `${origin}/`
	};
}
