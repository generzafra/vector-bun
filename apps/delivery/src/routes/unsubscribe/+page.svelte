<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head>
	<title>Email preferences</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="page">
	<section class="lead" aria-labelledby="unsub-title">
		<h1 id="unsub-title">Email preferences</h1>
		{#if form?.ok}
			<p class="status" role="status">
				{form.email} is unsubscribed from marketing email for this business.
			</p>
		{:else}
			<p>
				Stop marketing email from this business. Transactional replies about an open request may
				still be sent by a person.
			</p>
			{#if form?.error}
				<p class="err" role="alert">{form.error}</p>
			{/if}
			<form method="post">
				<input type="hidden" name="token" value={data.token} />
				<button type="submit">Unsubscribe from marketing email</button>
			</form>
		{/if}
	</section>
</main>
