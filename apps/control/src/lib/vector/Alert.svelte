<script lang="ts">
	let {
		tone = 'danger',
		children
	}: { tone?: 'danger' | 'warning' | 'info'; children: import('svelte').Snippet } = $props();
</script>

<p class="alert" data-tone={tone} role="status">
	{@render children()}
</p>

<style>
	.alert {
		margin: 0 0 var(--vector-space-5);
		padding: var(--vector-space-3) var(--vector-space-4);
		border-radius: var(--vector-radius-sm);
		border: 1px solid var(--border-default);
		background: var(--surface-2);
	}

	.alert[data-tone='danger'] {
		color: var(--vector-risk-danger);
		border-color: color-mix(in srgb, var(--vector-risk-danger) 35%, transparent);
	}

	.alert[data-tone='warning'] {
		color: var(--vector-risk-warning);
	}

	.alert[data-tone='info'] {
		color: var(--vector-signal);
	}
</style>
