import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: [
			'@vector/auth',
			'@vector/config',
			'@vector/contracts',
			'@vector/db',
			'@vector/domain',
			'@vector/observability',
			'@vector/ui'
		]
	}
});
