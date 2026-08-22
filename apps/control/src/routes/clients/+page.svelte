<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Clients</h1>
{#if form?.error}
	<p class="err">{form.error}</p>
{/if}
{#if data.clients.length === 0}
	<p>No clients yet.</p>
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

{#if data.permissions.includes('clients.manage')}
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
{/if}
