export function createRequestId() {
	return crypto.randomUUID();
}

export function logInfo(operation: string, fields: Record<string, unknown> = {}) {
	console.info(
		JSON.stringify({
			level: 'info',
			timestamp: new Date().toISOString(),
			operation,
			...sanitize(fields)
		})
	);
}

export function logError(operation: string, error: unknown, fields: Record<string, unknown> = {}) {
	console.error(
		JSON.stringify({
			level: 'error',
			timestamp: new Date().toISOString(),
			operation,
			error: error instanceof Error ? error.message : 'unknown',
			...sanitize(fields)
		})
	);
}

function sanitize(fields: Record<string, unknown>) {
	const blocked = new Set(['password', 'token', 'secret', 'authorization', 'cookie']);
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(fields)) {
		if (blocked.has(key.toLowerCase())) continue;
		out[key] = value;
	}
	return out;
}
