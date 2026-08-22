<script lang="ts">
	let { title, detail }: { title: string; detail?: string } = $props();
</script>

<div class="empty">
	<p class="title">{title}</p>
	{#if detail}
		<p class="detail">{detail}</p>
	{/if}
</div>

<style>
	.empty {
		display: grid;
		gap: var(--vector-space-2);
		padding: var(--vector-space-5) 0;
	}

	.title,
	.detail {
		margin: 0;
	}

	.title {
		color: var(--text-primary);
	}

	.detail {
		color: var(--text-secondary);
	}
</style>
