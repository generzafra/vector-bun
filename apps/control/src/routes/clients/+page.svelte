<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';

	let { data, form } = $props();
</script>

<PageHeader
	eyebrow="Tenancy"
	title="Clients"
	description="Each client is an isolated tenant. Identifiers stay on the authorized membership set."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}

<section>
	{#if data.clients.length === 0}
		<EmptyState title="No clients yet." detail="Create a client to start a Vector Growth System." />
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Slug</th>
				</tr>
			</thead>
			<tbody>
				{#each data.clients as client (client.id)}
					<tr>
						<td>{client.name}</td>
						<td>{client.slug}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

{#if data.permissions.includes('clients.manage')}
	<section>
		<h2>Create client</h2>
		<form method="post" action="?/create">
			<input type="hidden" name="_csrf" value={data.csrf} />
			<label>
				Name
				<input name="name" required />
			</label>
			<label>
				Slug
				<input name="slug" required />
			</label>
			<label>
				Timezone
				<input name="timezone" value="UTC" />
			</label>
			<button type="submit">Create</button>
		</form>
	</section>
{/if}
