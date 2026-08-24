<script lang="ts">
	import { hasOperatorControlNav } from '@vector/contracts';
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';

	let { data, form } = $props();
	const operatorNav = $derived(hasOperatorControlNav(data.permissions));
	const active = $derived(data.clients.find((client) => client.id === data.activeClientId) ?? null);
	const canSwitch = $derived(data.clients.length > 1);
</script>

<PageHeader
	eyebrow={operatorNav ? 'Workspace' : 'Your business'}
	title="Overview"
	description={operatorNav
		? 'Choose the client you are working on. One tenant context at a time.'
		: 'How this business is doing. Sales and qualified-lead summaries will appear here once they are recorded.'}
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}

<section>
	{#if data.clients.length === 0}
		<EmptyState
			title={operatorNav ? 'No clients available.' : 'No business is assigned yet.'}
			detail={operatorNav
				? 'Create a client before switching workspace context.'
				: 'Ask your Vector operator to give you access.'}
		/>
	{:else if canSwitch}
		<p>
			{operatorNav ? 'Active client' : 'Working in'}: {active?.name ?? 'none'}
		</p>
		<form method="post" action="?/switchClient">
			<input type="hidden" name="_csrf" value={data.csrf} />
			<label>
				{operatorNav ? 'Switch client' : 'Choose business'}
				<select name="clientId">
					{#each data.clients as client (client.id)}
						<option value={client.id} selected={client.id === data.activeClientId}>
							{client.name}
						</option>
					{/each}
				</select>
			</label>
			<button type="submit">{operatorNav ? 'Use client' : 'Switch'}</button>
		</form>
	{:else}
		<p>Working in {active?.name ?? 'this business'}.</p>
		<p>Open Leads, Approvals, or Goals from the menu.</p>
	{/if}
</section>
