export function isHealthPath(pathname: string) {
	return pathname === '/health' || pathname === '/health/';
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
