import { purgeOrphanTestMembers, purgeTenants } from '@vector/db';
import { createClient as createDomainClient } from '@vector/domain';

const tracked = new Set<string>();

/** Create a client and remember it so the test preload can delete it afterwards. */
export async function createTestClient(
	...args: Parameters<typeof createDomainClient>
): ReturnType<typeof createDomainClient> {
	const created = await createDomainClient(...args);
	tracked.add(created.id);
	return created;
}

export async function purgeTrackedTenants() {
	const ids = [...tracked];
	if (ids.length === 0) return;
	await purgeTenants(ids);
	tracked.clear();
	await purgeOrphanTestMembers();
}
