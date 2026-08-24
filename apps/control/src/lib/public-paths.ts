export const CONTROL_PUBLIC_PATHS = ['/login', '/privacy', '/terms'] as const;

export function isControlPublicPath(pathname: string) {
	const [withoutQuery] = pathname.split('?');
	const path = withoutQuery ?? pathname;
	const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
	return (CONTROL_PUBLIC_PATHS as readonly string[]).includes(normalized);
}
