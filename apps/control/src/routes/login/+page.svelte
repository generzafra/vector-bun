<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';

	let { form } = $props();
</script>

<PageHeader
	eyebrow="Authenticated access"
	title="Sign in"
	description="Operator and client access to Vector Control."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}

<form method="post">
	<label>
		Email
		<input name="email" type="email" autocomplete="username" required />
	</label>
	<label>
		Password
		<input name="password" type="password" autocomplete="current-password" required />
	</label>
	<button type="submit">Sign in</button>
</form>
