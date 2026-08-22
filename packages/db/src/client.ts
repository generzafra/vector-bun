import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env, isViteBuild } from '@vector/config';
import * as schema from './schema';

let sqlClient: ReturnType<typeof postgres> | null = null;

function createDb() {
	sqlClient = postgres(env.DATABASE_URL, {
		max: 10,
		idle_timeout: 30,
		connect_timeout: 10
	});
	return drizzle(sqlClient, { schema });
}

export const db = isViteBuild ? ({} as ReturnType<typeof createDb>) : createDb();

export async function closeDb() {
	if (!sqlClient) return;
	await sqlClient.end({ timeout: 5 });
	sqlClient = null;
}

export { schema };
