<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status}</title>
</svelte:head>

<p>{page.status}: {page.error?.message ?? 'Unknown host'}</p>
