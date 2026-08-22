<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';

	let { data, form } = $props();
</script>

<PageHeader
	eyebrow="Access"
	title="Members"
	description="Memberships are scoped to the active client. Role strings are not authorization."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}

<section>
	{#if data.memberships.length === 0}
		<EmptyState title="No members for the active client." />
	{:else}
		<table>
			<thead>
				<tr>
					<th>Membership</th>
					<th>Role</th>
				</tr>
			</thead>
			<tbody>
				{#each data.memberships as membership (membership.id)}
					<tr>
						<td>{membership.userId}</td>
						<td>{membership.roleId}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

{#if data.permissions.includes('users.manage')}
	<section>
		<h2>Add member</h2>
		<form method="post" action="?/create">
			<input type="hidden" name="_csrf" value={data.csrf} />
			<label>
				Email
				<input name="email" type="email" required />
			</label>
			<label>
				Name
				<input name="name" required />
			</label>
			<label>
				Role
				<select name="roleKey">
					<option value="read_only">Read only</option>
					<option value="client_admin">Client admin</option>
					<option value="client_owner">Client owner</option>
				</select>
			</label>
			<button type="submit">Add member</button>
		</form>
	</section>
{/if}
