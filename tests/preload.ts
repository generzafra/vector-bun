process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgres://vector:vector@127.0.0.1:5436/vector';
process.env.REDIS_URL ??= 'redis://127.0.0.1:6382';
process.env.STORAGE_LOCAL_DIR ??= `${process.cwd()}/.data/test-storage`;

const { afterAll } = await import('bun:test');
const { closeDb } = await import('@vector/db');

afterAll(async () => {
	await closeDb();
});
