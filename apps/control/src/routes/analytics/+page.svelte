<script lang="ts">
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data } = $props();

	function percent(value: number | null) {
		return value === null ? '—' : `${value}%`;
	}
</script>

<PageHeader
	eyebrow="Measurement"
	title="Analytics"
	description="Conversion uses the Vector event taxonomy from Postgres. Preview traffic stays separate. PostHog is optional and never receives test events or form fields."
/>

{#if data.needsClient}
	<section>
		<EmptyState title="Select a client on Overview first." />
	</section>
{:else if !data.report}
	<section>
		<EmptyState title="Analytics could not be loaded." />
	</section>
{:else}
	<section>
		<h2>Provider</h2>
		<p>Source of truth: {data.report.sourceOfTruth}</p>
		<p>
			Adapter:
			<StatusChip
				label={data.report.provider.adapter}
				tone={data.report.provider.adapter === 'posthog' ? 'success' : 'muted'}
			/>
		</p>
		<p>{data.report.provider.detail}</p>
	</section>

	<section>
		<h2>Production conversion</h2>
		{#if data.report.conversion.production.steps.every((step) => step.count === 0)}
			<EmptyState
				title="No production events yet."
				detail="Counts appear after a production hostname records taxonomy events."
			/>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Event</th>
						<th>Count</th>
						<th>From previous</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.conversion.production.steps as step (step.name)}
						<tr>
							<td>{step.name}</td>
							<td>{step.count}</td>
							<td>{percent(step.rateFromPrevious)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Preview conversion</h2>
		<p>Test-mode events from preview hosts. They do not go to PostHog.</p>
		{#if data.report.conversion.preview.steps.every((step) => step.count === 0)}
			<EmptyState title="No preview events yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Event</th>
						<th>Count</th>
						<th>From previous</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.conversion.preview.steps as step (step.name)}
						<tr>
							<td>{step.name}</td>
							<td>{step.count}</td>
							<td>{percent(step.rateFromPrevious)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Acquisition to lead</h2>
		{#if data.report.conversion.sources.length === 0}
			<EmptyState
				title="No production attribution yet."
				detail="Last non-direct source is recorded when a production lead is created."
			/>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Channel</th>
						<th>Source</th>
						<th>Campaign</th>
						<th>Leads</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.conversion.sources as source (`${source.channel}:${source.source}:${source.campaign}`)}
						<tr>
							<td>{source.channel}</td>
							<td>{source.source ?? '—'}</td>
							<td>{source.campaign ?? '—'}</td>
							<td>{source.leads}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Launch funnel</h2>
		{#if !data.report.launch}
			<EmptyState title="Launch timing is hidden without launch.read." />
		{:else}
			<p>
				Status:
				<StatusChip label={data.report.launch.status} tone="info" />
			</p>
			<p>
				Contract to Vector Ready: {data.report.launch.timing.contractToReadySeconds ?? '—'} seconds
			</p>
			<p>
				Vector Ready to live: {data.report.launch.timing.readyToLiveSeconds ?? '—'} seconds
			</p>
			<p>Paused: {data.report.launch.timing.pausedSeconds} seconds</p>
			<p>These are recorded intervals. A 24-hour SLA is not measured here.</p>
			{#if data.report.launch.transitions.length === 0}
				<EmptyState title="No launch transitions recorded yet." />
			{:else}
				<table>
					<thead>
						<tr>
							<th>To status</th>
							<th>Events</th>
						</tr>
					</thead>
					<tbody>
						{#each data.report.launch.transitions as row (row.toStatus)}
							<tr>
								<td>{row.toStatus}</td>
								<td>{row.count}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		{/if}
	</section>
{/if}
