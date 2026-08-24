export const CONTROL_OVERVIEW_PATH = '/overview';

export const CONTROL_PUBLIC_PATHS = ['/', '/login', '/privacy', '/terms', '/logout'] as const;

export function normalizeControlPath(pathname: string) {
	const [withoutQuery] = pathname.split('?');
	const path = withoutQuery ?? pathname;
	return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

export function isControlPublicPath(pathname: string) {
	return (CONTROL_PUBLIC_PATHS as readonly string[]).includes(normalizeControlPath(pathname));
}

export function isControlMarketingPath(pathname: string) {
	return normalizeControlPath(pathname) === '/';
}
