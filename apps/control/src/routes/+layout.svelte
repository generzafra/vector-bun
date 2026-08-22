<script lang="ts">
	import '../app.css';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>Vector Control</title>
</svelte:head>

<div class="shell">
	<header class="top">
		<strong>Vector</strong>
		<nav>
			{#if data.userId}
				<a href="/">Overview</a>
				<a href="/clients">Clients</a>
				<a href="/knowledge">Knowledge</a>
				<a href="/funnel">Funnel</a>
				<a href="/members">Members</a>
			{/if}
		</nav>
	</header>
	<main>
		{@render children()}
	</main>
</div>
