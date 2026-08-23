export type PublicDomainKind = 'preview' | 'production' | 'redirect';

export function publicPath(pathname: string | null | undefined) {
	if (!pathname || pathname === '/') return '/';
	const trimmed = pathname.replace(/\/+$/, '');
	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function publicCanonicalUrl(origin: string, pathname = '/') {
	const base = origin.replace(/\/$/, '');
	const path = publicPath(pathname);
	return path === '/' ? `${base}/` : `${base}${path}`;
}

export type PublicPageMetaInput = {
	title: string;
	description: string;
	origin: string;
	domainKind: PublicDomainKind;
	pathname?: string;
};

export type PublicPageMeta = {
	title: string;
	description: string;
	robots: 'noindex, nofollow' | 'index, follow';
	canonical: string | null;
};

export function publicPageMeta(input: PublicPageMetaInput): PublicPageMeta {
	const preview = input.domainKind === 'preview';
	return {
		title: input.title,
		description: input.description,
		robots: preview ? 'noindex, nofollow' : 'index, follow',
		canonical: preview ? null : publicCanonicalUrl(input.origin, input.pathname ?? '/')
	};
}
