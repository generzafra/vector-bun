<script lang="ts">
	let { current = '' }: { current?: string } = $props();
</script>

<nav class="legal" aria-label="Legal">
	<a href="/privacy" aria-current={current === '/privacy' ? 'page' : undefined}>Privacy Policy</a>
	<a href="/terms" aria-current={current === '/terms' ? 'page' : undefined}>Terms of Use</a>
</nav>

<style>
	.legal {
		display: flex;
		flex-wrap: wrap;
		gap: var(--vector-space-3);
	}

	.legal a {
		color: var(--text-tertiary);
		text-decoration: none;
		font-size: 0.85rem;
	}

	.legal a:hover,
	.legal a[aria-current='page'] {
		color: var(--vector-text-primary);
	}
</style>
