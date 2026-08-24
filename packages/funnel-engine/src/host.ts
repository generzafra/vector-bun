export function isHealthPath(pathname: string) {
	return pathname === '/health' || pathname === '/health/';
}

export function isDomainChallengePath(pathname: string) {
	return pathname === '/.well-known/vector-domain' || pathname === '/.well-known/vector-domain/';
}

export function isRobotsPath(pathname: string) {
	return pathname === '/robots.txt';
}

export function isSitemapPath(pathname: string) {
	return pathname === '/sitemap.xml';
}

export function isLlmsTxtPath(pathname: string) {
	return pathname === '/llms.txt';
}

export function isBrandLogoPath(pathname: string) {
	return pathname === '/brand-logo' || pathname === '/brand-logo/';
}

export function isOgImagePath(pathname: string) {
	return pathname === '/og-image' || pathname === '/og-image/';
}

export function isUnsubscribePath(pathname: string) {
	return pathname === '/unsubscribe' || pathname === '/unsubscribe/';
}

export function isPreviewReservedHostname(hostname: string) {
	return hostname.startsWith('preview-');
}

const HOSTNAME_PATTERN =
	/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isValidPublicHostname(hostname: string) {
	return HOSTNAME_PATTERN.test(hostname) && !isPreviewReservedHostname(hostname);
}

export function normalizeHostname(host: string | null | undefined): string | null {
	if (!host) return null;
	let value = host.trim().toLowerCase();
	if (value.endsWith('.')) value = value.slice(0, -1);
	const colon = value.lastIndexOf(':');
	if (colon > 0 && /^\d+$/.test(value.slice(colon + 1))) {
		value = value.slice(0, colon);
	}
	return value || null;
}

export function previewHostname(slug: string, parentHost: string) {
	return `preview-${slug}.${parentHost}`;
}

export function previewOrigin(hostname: string, deliveryOrigin: string) {
	const url = new URL(deliveryOrigin);
	const port = url.port ? `:${url.port}` : '';
	return `${url.protocol}//${hostname}${port}`;
}

export function unknownHostPayload() {
	return { error: 'Unknown host' };
}
