import { ForbiddenError, type Capability } from '@vector/contracts';

export function hasCapability(permissions: string[], capability: Capability) {
	return permissions.includes(capability);
}

export function requireCapability(permissions: string[], capability: Capability) {
	if (!hasCapability(permissions, capability)) {
		throw new ForbiddenError(`Missing capability ${capability}`);
	}
}
