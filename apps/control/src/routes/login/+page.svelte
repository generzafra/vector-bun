<script lang="ts">
	let { form } = $props();
</script>

<h1>Sign in</h1>
{#if form?.error}
	<p class="err">{form.error}</p>
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
