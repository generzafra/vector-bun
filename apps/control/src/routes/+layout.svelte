<script lang="ts">
	import AppShell from '$lib/vector/AppShell.svelte';
	import '../app.css';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>Vector Control</title>
</svelte:head>

<AppShell userId={data.userId}>
	{@render children()}
</AppShell>
