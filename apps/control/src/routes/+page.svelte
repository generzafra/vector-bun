<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Overview</h1>
<p>Active client: {data.activeClientId ?? 'none'}</p>

{#if form?.error}
	<p class="err">{form.error}</p>
{/if}

{#if data.clients.length === 0}
	<p>No clients available.</p>
{:else}
	<form method="post" action="?/switchClient">
		<input type="hidden" name="_csrf" value={data.csrf} />
		<label>
			Switch client
			<select name="clientId">
				{#each data.clients as client (client.id)}
					<option value={client.id} selected={client.id === data.activeClientId}>
						{client.name}
					</option>
				{/each}
			</select>
		</label>
		<button type="submit">Use client</button>
	</form>
{/if}
