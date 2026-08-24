<script lang="ts">
	import AppShell from '$lib/vector/AppShell.svelte';
	import '../app.css';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>{data.marketingShell ? 'Vector — Growth OS' : 'Vector Control'}</title>
</svelte:head>

{#if data.marketingShell}
	{@render children()}
{:else}
	<AppShell userId={data.userId} permissions={data.permissions} csrf={data.csrf}>
		{@render children()}
	</AppShell>
{/if}
