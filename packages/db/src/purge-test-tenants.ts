import { closeDb } from './client';
import { purgeTestTenants } from './purge-tenant';

const result = await purgeTestTenants();
console.info(JSON.stringify(result));
await closeDb();
