<script lang="ts">
	let {
		eyebrow,
		title,
		description
	}: {
		eyebrow?: string;
		title: string;
		description?: string;
	} = $props();
</script>

<header class="header">
	{#if eyebrow}
		<p class="eyebrow">{eyebrow}</p>
	{/if}
	<h1>{title}</h1>
	{#if description}
		<p class="description">{description}</p>
	{/if}
</header>

<style>
	.header {
		display: grid;
		gap: var(--vector-space-2);
		margin-bottom: var(--vector-space-6);
	}

	.eyebrow {
		margin: 0;
		color: var(--text-tertiary);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		line-height: 1.15;
		font-weight: 650;
	}

	.description {
		margin: 0;
		max-width: 46rem;
		color: var(--text-secondary);
	}
</style>
