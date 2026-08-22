<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<p>{page.status}: {page.error?.message ?? 'Unknown host'}</p>
