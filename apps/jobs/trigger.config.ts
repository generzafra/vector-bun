import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
	project: process.env.TRIGGER_PROJECT_REF ?? 'proj_vector_placeholder',
	runtime: 'bun',
	dirs: ['./src/trigger'],
	maxDuration: 60,
	retries: {
		enabledInDev: false,
		default: {
			maxAttempts: 5,
			minTimeoutInMs: 1_000,
			maxTimeoutInMs: 30_000,
			factor: 2,
			randomize: true
		}
	}
});
