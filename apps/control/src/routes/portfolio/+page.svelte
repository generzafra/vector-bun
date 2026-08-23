<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('scale.manage'));
	const overview = $derived(data.overview);

	function clockLabel(seconds: number | null) {
		if (seconds === null) return '—';
		const hours = seconds / 3600;
		return `${hours.toFixed(1)}h`;
	}

	function reasonTone(reason: string) {
		if (reason === 'launch_failed' || reason === 'usage_would_deny' || reason === 'sla_over') {
			return 'danger' as const;
		}
		if (reason === 'blocked' || reason === 'paused' || reason === 'open_block') {
			return 'warning' as const;
		}
		return 'info' as const;
	}

	function statusTone(status: string) {
		if (status === 'live') return 'success' as const;
		if (status === 'launch_failed') return 'danger' as const;
		if (status === 'blocked' || status === 'paused') return 'warning' as const;
		return 'muted' as const;
	}
</script>

<PageHeader
	eyebrow="Portfolio operations"
	title="Portfolio"
	description="Oversee clients by exception. Usage is evaluate-only in this slice: a would-deny event is recorded and the caller is not refused. Vector 24 clocks are observed ready-to-live time excluding pauses. Class D is unpromised. This is not a commercial 24-hour guarantee and not a 20-client capacity claim."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}
{#if form?.notice}
	<Alert tone="info">{form.notice}</Alert>
{/if}

<section>
	<h2>Vector 24 clocks</h2>
	<p>
		Observed ready-to-live among promised classes you can access. Class D is excluded. Median
		{clockLabel(overview.kpi.medianReadyToLiveSeconds)}. Under 12h:
		{overview.kpi.percentUnder12h === null ? '—' : `${overview.kpi.percentUnder12h}%`}. Under 24h:
		{overview.kpi.percentUnder24h === null ? '—' : `${overview.kpi.percentUnder24h}%`}.
		{overview.kpi.livePromised} live promised sample{overview.kpi.livePromised === 1 ? '' : 's'}.
		{overview.quietCount} quiet of {overview.watched} watched.
	</p>
</section>

<section>
	<h2>Exceptions</h2>
	<p>
		Launch failures, blockers, pauses, SLA warnings, and usage warnings. Alpha rows never include
		Beta limits or clocks.
	</p>
	{#if overview.exceptions.length === 0}
		<EmptyState title="No portfolio exceptions for clients you can access." />
	{:else}
		<table>
			<thead>
				<tr>
					<th>Client</th>
					<th>Launch</th>
					<th>Clock</th>
					<th>Readiness</th>
					<th>Why</th>
					<th>Next</th>
				</tr>
			</thead>
			<tbody>
				{#each overview.exceptions as row (row.clientId)}
					<tr>
						<td>
							<strong>{row.clientName}</strong>
							<br />
							Class {row.launch.launchClass}
							{row.clock.promised ? '' : ' · unpromised'}
						</td>
						<td>
							<StatusChip label={row.launch.status} tone={statusTone(row.launch.status)} />
						</td>
						<td>
							{row.clock.started ? clockLabel(row.clock.elapsedSeconds) : 'not started'}
							{#if row.clock.overClass}
								<StatusChip label="over class" tone="danger" />
							{:else if row.clock.warningClass}
								<StatusChip label="class warning" tone="warning" />
							{/if}
						</td>
						<td>{row.readiness.scorePercent}%</td>
						<td>
							{#each row.reasons as reason (reason)}
								<StatusChip label={reason.replaceAll('_', ' ')} tone={reasonTone(reason)} />
							{/each}
						</td>
						<td>{row.nextAction ?? '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

{#if canManage}
	<section>
		<h2>Override a limit</h2>
		<p>
			Window stays fixed per family. Enforce mode cannot be set here. A written reason is required
			and audited.
		</p>
		<form method="post" action="?/limit" class="wide">
			<input type="hidden" name="_csrf" value={data.csrf} />
			<label>
				Client
				<select name="clientId" required>
					{#each overview.clients as row (row.clientId)}
						<option value={row.clientId}>{row.clientName}</option>
					{/each}
				</select>
			</label>
			<label>
				Family
				<select name="resourceFamily">
					<option value="api">api</option>
					<option value="workflow">workflow</option>
					<option value="ai">ai</option>
					<option value="email">email</option>
					<option value="upload">upload</option>
					<option value="analytics">analytics</option>
				</select>
			</label>
			<label>
				Hard limit
				<input name="hardLimit" type="number" min="1" max="1000000" required />
			</label>
			<label>
				Reason
				<textarea name="reason" required minlength="8" maxlength="400"></textarea>
			</label>
			<button type="submit">Save limit</button>
		</form>
	</section>
{/if}
