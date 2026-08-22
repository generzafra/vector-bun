<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Members</h1>
{#if form?.error}
	<p class="err">{form.error}</p>
{/if}
{#if data.memberships.length === 0}
	<p>No members for the active client.</p>
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

{#if data.permissions.includes('users.manage')}
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
{/if}
