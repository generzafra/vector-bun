import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env, isViteBuild } from '@vector/config';
import * as schema from './schema';

type SqlClient = ReturnType<typeof postgres>;

let sqlClient: SqlClient | null = null;

function createDb() {
	sqlClient = postgres(env.DATABASE_URL, {
		max: 10,
		idle_timeout: 30,
		connect_timeout: 10,
		prepare: false
	});
	return drizzle(sqlClient, { schema });
}

type AppDb = ReturnType<typeof createDb>;

let inner: AppDb | null = isViteBuild ? null : createDb();

function activeDb(): AppDb {
	if (!sqlClient || !inner) {
		inner = createDb();
	}
	return inner;
}

export const db: AppDb = isViteBuild
	? ({} as AppDb)
	: new Proxy({} as AppDb, {
			get(_target, prop, receiver) {
				const target = activeDb();
				const value = Reflect.get(target, prop, receiver);
				return typeof value === 'function' ? value.bind(target) : value;
			}
		});

export async function closeDb() {
	if (!sqlClient) return;
	const client = sqlClient;
	sqlClient = null;
	inner = null;
	await client.end({ timeout: 1 });
}

export { schema };
