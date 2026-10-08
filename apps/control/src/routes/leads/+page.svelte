<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';
	import {
		SALES_OUTCOME_CAPTURE,
		formatMinorUnits,
		hasOperatorControlNav
	} from '@vector/contracts';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('leads.manage'));
	const operatorNav = $derived(hasOperatorControlNav(data.permissions));
	const coverage = $derived(data.coverage);
	const attribution = $derived(data.attribution);

	function evidenceWord(value: string | null | undefined) {
		if (value === 'measured') return 'Measured';
		if (value === 'observed') return 'Observed';
		if (value === 'inferred') return 'Inferred';
		if (value === 'estimated') return 'Estimated';
		return 'Unknown';
	}

	function tone(status: string, isTest: boolean) {
		if (isTest) return 'warning' as const;
		if (status === 'won' || status === 'qualified') return 'success' as const;
		if (status === 'lost' || status === 'spam') return 'danger' as const;
		if (status === 'working') return 'info' as const;
		return 'muted' as const;
	}

	function statusLabel(status: string) {
		if (status === 'working') return 'Contacted';
		if (status === 'new') return 'New';
		if (status === 'qualified') return 'Qualified';
		if (status === 'won') return 'Won';
		if (status === 'lost') return 'Lost';
		if (status === 'spam') return 'Spam';
		return status;
	}

	function outcomeLabel(type: string) {
		if (type === 'contacted') return 'Contacted';
		if (type === 'qualified') return 'Qualified';
		if (type === 'appointment') return 'Appointment';
		if (type === 'proposal') return 'Proposal';
		if (type === 'won') return 'Won';
		if (type === 'lost') return 'Lost';
		return type;
	}
</script>

<PageHeader
	eyebrow={operatorNav ? 'CRM' : undefined}
	title="Leads"
	description={operatorNav
		? 'Contacts created from Delivery form submits. Attribution is first touch and last non-direct. Preview hosts stay test-mode.'
		: 'People who asked to hear from you. Mark what happened so Vector can keep the record straight.'}
/>

{#if data.crm}
	<p>{data.crm.detail}</p>
{/if}

{#if attribution}
	<section>
		<h2>Attribution</h2>
		<p>
			{evidenceWord(attribution.evidenceClass)}.
			{operatorNav ? attribution.detail : 'This is the source already stored for these leads.'}
		</p>
	</section>
{/if}

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
			detail={operatorNav
				? "A tracked visitor submit on this client's funnel will appear here with consent and attribution."
				: 'When someone submits a form on your site, they will appear here. Mark what happened, or connect a CRM later. Vector will not invent sales.'}
		/>
	</section>
{:else}
	{#if coverage}
		<section>
			<h2>Outcome coverage</h2>
			{#if coverage.qualifiedCount === 0}
				<p>
					Qualified leads with a sale, loss, or appointment will show coverage here. Vector will not
					invent sales.
				</p>
			{:else}
				<p>
					{coverage.knownCount} of {coverage.qualifiedCount} qualified leads have a recorded outcome{coverage.coveragePercent !=
					null
						? ` (${coverage.coveragePercent}%, ${coverage.evidenceClass})`
						: ''}.
				</p>
				{#if coverage.knownCount < coverage.qualifiedCount}
					<p>Mark what happened, or connect a CRM later. Vector will not invent sales.</p>
				{/if}
			{/if}
		</section>
	{/if}
	<section>
		<table>
			<thead>
				<tr>
					<th>Contact</th>
					<th>Status</th>
					{#if operatorNav}
						<th>Score</th>
						<th>First touch</th>
						<th>Last non-direct</th>
						<th>Host</th>
					{/if}
					{#if canManage}<th>What happened</th>{/if}
					{#if canManage && operatorNav}<th>Update</th>{/if}
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
								label={lead.isTest
									? `${statusLabel(lead.status)} · test`
									: statusLabel(lead.status)}
								tone={tone(lead.status, lead.isTest)}
							/>
							<p>{evidenceWord(lead.attribution?.evidenceClass)}</p>
							{#if lead.salesOutcome}
								<p>
									{outcomeLabel(lead.salesOutcome.outcomeType)}
									{#if lead.salesOutcome.amountMinor != null && lead.salesOutcome.currency}
										· {formatMinorUnits(lead.salesOutcome.amountMinor, lead.salesOutcome.currency)}
									{/if}
								</p>
							{/if}
						</td>
						{#if operatorNav}
							<td>{lead.score ?? '—'}</td>
							<td>
								{lead.attribution
									? `${lead.attribution.firstTouchChannel}${lead.attribution.firstTouchSource ? ` / ${lead.attribution.firstTouchSource}` : ''}`
									: '—'}
							</td>
							<td>
								{lead.attribution
									? `${lead.attribution.lastNonDirectChannel}${lead.attribution.lastNonDirectSource ? ` / ${lead.attribution.lastNonDirectSource}` : ''} · ${evidenceWord(lead.attribution.evidenceClass)}`
									: '—'}
							</td>
							<td>{lead.hostname}</td>
						{/if}
						{#if canManage}
							<td>
								<div class="lead-capture">
									{#each SALES_OUTCOME_CAPTURE as item (item.type)}
										<form method="post" action="?/outcome">
											<input type="hidden" name="_csrf" value={data.csrf} />
											<input type="hidden" name="leadId" value={lead.id} />
											<input type="hidden" name="outcomeType" value={item.type} />
											{#if item.type === 'won'}
												<label>
													Amount (optional)
													<input
														name="amountMajor"
														inputmode="numeric"
														pattern="[0-9]*"
														placeholder="85000"
													/>
												</label>
												<label>
													Currency
													<input name="currency" maxlength="3" placeholder="PHP" />
												</label>
											{/if}
											<button type="submit" class="secondary">{item.label}</button>
										</form>
									{/each}
								</div>
							</td>
						{/if}
						{#if canManage && operatorNav}
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
