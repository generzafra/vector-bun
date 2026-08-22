export type DeliveryDecision =
	{ allow: true; kind: 'health' } | { allow: false; kind: 'unknown_host'; host: string | null };

export function resolveDeliveryRequest(pathname: string, host: string | null): DeliveryDecision {
	if (pathname === '/health' || pathname === '/health/') {
		return { allow: true, kind: 'health' };
	}
	return { allow: false, kind: 'unknown_host', host };
}

export function unknownHostPayload() {
	return { error: 'Unknown host' };
}
