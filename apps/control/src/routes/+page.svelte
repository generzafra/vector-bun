<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';

	let { data, form } = $props();
</script>

<PageHeader
	eyebrow="Workspace"
	title="Overview"
	description="Select the active client before knowledge, funnel, or launch work. VECTOR operates one tenant context at a time."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}

<section>
	<p>Active client: {data.activeClientId ?? 'none'}</p>
	{#if data.clients.length === 0}
		<EmptyState
			title="No clients available."
			detail="Create a client before switching workspace context."
		/>
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
</section>
