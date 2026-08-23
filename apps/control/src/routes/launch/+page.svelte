<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('launch.manage'));
	const canManageDomains = $derived(data.permissions.includes('pages.manage'));
	const managedDomains = $derived(
		data.domains.filter((domain) => domain.kind === 'production' || domain.kind === 'redirect')
	);

	function domainTone(status: string) {
		if (status === 'active') return 'success' as const;
		if (status === 'verified') return 'info' as const;
		if (status === 'pending') return 'warning' as const;
		return 'muted' as const;
	}
	const clocks = $derived(
		data.launch
			? [
					['Signed', data.launch.launch.signedAt],
					['Onboarding started', data.launch.launch.onboardingStartedAt],
					['Vector Ready', data.launch.launch.vectorReadyAt],
					['Generation started', data.launch.launch.generationStartedAt],
					['QA started', data.launch.launch.qaStartedAt],
					['Approval requested', data.launch.launch.approvalRequestedAt],
					['Approval received', data.launch.launch.approvalReceivedAt],
					['Domain ready', data.launch.launch.domainReadyAt],
					['Launch started', data.launch.launch.launchStartedAt],
					['Live', data.launch.launch.liveAt],
					['Paused', data.launch.launch.pausedAt]
				]
			: []
	);
	const openBlocks = $derived(data.launch?.blocks.filter((block) => !block.resolvedAt) ?? []);
</script>

<PageHeader
	eyebrow="Vector 24 readiness"
	title="Launch"
	description="Track readiness and launch state for the active client. The same checklist and states apply to every client. Clock fields are recorded. A 24-hour SLA is not measured in this slice. Preview stays private. Production hostnames are verified, then activated on the shared Delivery Plane."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}

{#if data.needsClient}
	<section>
		<EmptyState title="Select a client on Overview first." />
	</section>
{:else if !data.launch}
	<Alert>Launch could not be loaded.</Alert>
{:else}
	<section>
		<h2>Launch automation</h2>
		<p>
			Generate drafts, wire tracking, and queue QA are tenant-scoped policies on
			<a href="/autonomy">Autonomy</a>. S3 can auto-run opted-in queue QA and wire tracking on
			unpublished drafts only. Generate drafts stays human-led.
		</p>
	</section>
	<section>
		<h2>Production domain</h2>
		<p>
			Submit the client hostname, point DNS at Delivery, then verify and activate. HTTPS is issued
			at the edge after DNS is live. Preview remains noindex.
		</p>
		{#if managedDomains.length === 0}
			<p>No production or redirect hostname yet.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Hostname</th>
						<th>Kind</th>
						<th>Status</th>
						<th>Token</th>
						{#if canManageDomains}<th></th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each managedDomains as domain (domain.id)}
						<tr>
							<td>{domain.hostname}</td>
							<td>{domain.kind}</td>
							<td><StatusChip label={domain.status} tone={domainTone(domain.status)} /></td>
							<td><code>{domain.verificationToken ?? '—'}</code></td>
							{#if canManageDomains}
								<td>
									{#if domain.status === 'pending'}
										<form method="post" action="?/verifyDomain">
											<input type="hidden" name="_csrf" value={data.csrf} />
											<input type="hidden" name="id" value={domain.id} />
											<button type="submit">Verify</button>
										</form>
									{/if}
									{#if domain.status === 'verified'}
										<form method="post" action="?/activateDomain">
											<input type="hidden" name="_csrf" value={data.csrf} />
											<input type="hidden" name="id" value={domain.id} />
											<button type="submit">Activate</button>
										</form>
									{/if}
									{#if domain.status !== 'disabled'}
										<form method="post" action="?/disableDomain">
											<input type="hidden" name="_csrf" value={data.csrf} />
											<input type="hidden" name="id" value={domain.id} />
											<button class="secondary" type="submit">Disable</button>
										</form>
									{/if}
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManageDomains}
			<form class="wide" method="post" action="?/submitDomain">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Hostname
					<input name="hostname" required placeholder="www.client.com" />
				</label>
				<label>
					Kind
					<select name="kind">
						<option value="production">production</option>
						<option value="redirect">redirect</option>
					</select>
				</label>
				<button type="submit">Submit hostname</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Readiness</h2>
		<p>Score: {data.launch.readiness.scorePercent}%</p>
		<p>
			Blocking: {data.launch.readiness.blockingComplete} / {data.launch.readiness.blockingTotal}
		</p>
		<p>
			Optional: {data.launch.readiness.optionalComplete} / {data.launch.readiness.optionalTotal}
		</p>
		<p>
			Vector Ready:
			<StatusChip
				label={data.launch.readiness.vectorReady ? 'yes' : 'no'}
				tone={data.launch.readiness.vectorReady ? 'success' : 'muted'}
			/>
		</p>
		{#if canManage}
			<form method="post" action="?/recalculate">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Recalculate</button>
			</form>
		{/if}
		<table>
			<thead>
				<tr>
					<th>Item</th>
					<th>Kind</th>
					<th>Status</th>
					<th>Detail</th>
					{#if canManage}<th></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.launch.items as item (item.id)}
					<tr>
						<td>{item.label}</td>
						<td>{item.blocking ? 'blocking' : 'optional'}</td>
						<td>{item.status}</td>
						<td>{item.detail ?? ''}</td>
						{#if canManage}
							<td>
								{#if item.source === 'operator' && item.status !== 'complete'}
									<form method="post" action="?/completeItem">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="key" value={item.key} />
										<button type="submit">Record</button>
									</form>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section>
		<h2>State</h2>
		<p>
			Status:
			<StatusChip label={data.launch.launch.status} tone="info" />
		</p>
		<p>Class: {data.launch.launch.launchClass}</p>
		<p>Paused seconds: {data.launch.launch.pausedSeconds}</p>
		{#if data.launch.launch.failureReason}
			<p class="err">{data.launch.launch.failureReason}</p>
		{/if}
		{#each clocks as [label, value] (label)}
			<p>{label}: {value ?? '—'}</p>
		{/each}
		<h3>Timing splits</h3>
		<p>
			Contract to Vector Ready: {data.launch.timing.contractToReadySeconds ?? '—'} seconds
		</p>
		<p>
			Onboarding to Vector Ready: {data.launch.timing.onboardingToReadySeconds ?? '—'} seconds
		</p>
		<p>
			Vector Ready to live: {data.launch.timing.readyToLiveSeconds ?? '—'} seconds
		</p>
		<p>Paused: {data.launch.timing.pausedSeconds} seconds</p>
		<p>These are recorded intervals. A 24-hour SLA is not measured here.</p>
		{#if canManage}
			<form class="wide" method="post" action="?/transition">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Next state
					<select name="to">
						{#each data.launch.nextStates as state (state)}
							<option value={state}>{state}</option>
						{/each}
					</select>
				</label>
				<label>
					Class
					<select name="launchClass">
						{#each ['A', 'B', 'C', 'D'] as launchClass (launchClass)}
							<option value={launchClass} selected={launchClass === data.launch.launch.launchClass}>
								{launchClass}
							</option>
						{/each}
					</select>
				</label>
				<label>
					Reason
					<textarea name="reason" required></textarea>
				</label>
				<button type="submit">Change state</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Open blocks</h2>
		{#if openBlocks.length === 0}
			<p>No open blocks.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Item</th>
						<th>Message</th>
					</tr>
				</thead>
				<tbody>
					{#each openBlocks as block (block.id)}
						<tr>
							<td>{block.itemKey}</td>
							<td>{block.message}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Events</h2>
		{#if data.launch.events.length === 0}
			<p>No transitions yet.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>From</th>
						<th>To</th>
						<th>Reason</th>
					</tr>
				</thead>
				<tbody>
					{#each data.launch.events as event (event.id)}
						<tr>
							<td>{event.fromStatus}</td>
							<td>{event.toStatus}</td>
							<td>{event.reason}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
{/if}
