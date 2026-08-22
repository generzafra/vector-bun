const BLOCKED = new Set([
	'email',
	'name',
	'phone',
	'message',
	'company',
	'password',
	'token',
	'secret',
	'authorization',
	'cookie'
]);

export function sanitizeAnalyticsProperties(
	properties: Record<string, string | number | boolean | null | undefined>
) {
	const out: Record<string, string | number | boolean | null> = {};
	for (const [key, value] of Object.entries(properties)) {
		if (BLOCKED.has(key.toLowerCase())) continue;
		if (value === undefined) continue;
		out[key] = value;
	}
	return out;
}
