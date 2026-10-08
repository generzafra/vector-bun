import { clearSeedClientActivity } from './purge-tenant';

const result = await clearSeedClientActivity();
console.info(JSON.stringify(result));
