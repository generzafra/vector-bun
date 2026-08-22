<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('leads.manage'));

	function tone(status: string, isTest: boolean) {
		if (isTest) return 'warning' as const;
		if (status === 'won' || status === 'qualified') return 'success' as const;
		if (status === 'lost' || status === 'spam') return 'danger' as const;
		if (status === 'working') return 'info' as const;
		return 'muted' as const;
	}
</script>

<PageHeader
	eyebrow="CRM"
	title="Leads"
	description="Tenant-scoped contacts created from Delivery form submits. Attribution is first touch and last non-direct. Preview hosts stay test-mode."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}

{#if data.needsClient}
	<section>
		<EmptyState title="Select a client on Overview first." />
	</section>
{:else if data.leads.length === 0}
	<section>
		<EmptyState
			title="No leads yet."
			detail="A tracked visitor submit on this client's funnel will appear here with consent and attribution."
		/>
	</section>
{:else}
	<section>
		<table>
			<thead>
				<tr>
					<th>Contact</th>
					<th>Status</th>
					<th>Score</th>
					<th>First touch</th>
					<th>Last non-direct</th>
					<th>Host</th>
					{#if canManage}<th>Update</th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.leads as lead (lead.id)}
					<tr>
						<td>
							<p>{lead.contact.displayName}</p>
							<p>{lead.contact.email}</p>
						</td>
						<td>
							<StatusChip
								label={lead.isTest ? `${lead.status} · test` : lead.status}
								tone={tone(lead.status, lead.isTest)}
							/>
						</td>
						<td>{lead.score ?? '—'}</td>
						<td>
							{lead.attribution
								? `${lead.attribution.firstTouchChannel}${lead.attribution.firstTouchSource ? ` / ${lead.attribution.firstTouchSource}` : ''}`
								: '—'}
						</td>
						<td>
							{lead.attribution
								? `${lead.attribution.lastNonDirectChannel}${lead.attribution.lastNonDirectSource ? ` / ${lead.attribution.lastNonDirectSource}` : ''}`
								: '—'}
						</td>
						<td>{lead.hostname}</td>
						{#if canManage}
							<td>
								<form method="post" action="?/status">
									<input type="hidden" name="_csrf" value={data.csrf} />
									<input type="hidden" name="id" value={lead.id} />
									<label>
										Status
										<select name="status">
											{#each ['new', 'working', 'qualified', 'won', 'lost', 'spam'] as status (status)}
												<option value={status} selected={status === lead.status}>{status}</option>
											{/each}
										</select>
									</label>
									<label>
										Reason
										<input name="reason" required placeholder="Why this change" />
									</label>
									<button type="submit">Save</button>
								</form>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}
