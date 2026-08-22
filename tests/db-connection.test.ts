import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { clients, closeDb, db } from '@vector/db';

test('closeDb reopens the client for later queries', async () => {
	const [before] = await db
		.select({ slug: clients.slug })
		.from(clients)
		.where(eq(clients.slug, 'alpha'))
		.limit(1);
	expect(before?.slug).toBe('alpha');
	await closeDb();
	const [after] = await db
		.select({ slug: clients.slug })
		.from(clients)
		.where(eq(clients.slug, 'alpha'))
		.limit(1);
	expect(after?.slug).toBe('alpha');
});
