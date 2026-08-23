<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('ai.manage'));
	const overview = $derived(data.overview);

	function gateTone(eligible: boolean, blockedBy: string | null) {
		if (eligible) return 'success' as const;
		if (blockedBy === 'autonomy_ceiling' || blockedBy === 'auto_execute_disabled') {
			return 'warning' as const;
		}
		if (
			blockedBy === 'global_pause' ||
			blockedBy === 'client_pause' ||
			blockedBy === 'forbidden_action'
		) {
			return 'danger' as const;
		}
		return 'muted' as const;
	}

	function executionTone(status: string) {
		if (status === 'succeeded') return 'success' as const;
		if (status === 'blocked') return 'warning' as const;
		return 'danger' as const;
	}

	function reportLabel(output: unknown) {
		if (!output || typeof output !== 'object') return '—';
		const row = output as {
			kind?: string;
			periodKey?: string;
			observed?: { leadCreated?: number };
			sent?: boolean;
			published?: boolean;
		};
		if (row.kind !== 'internal_weekly_report') return 'Recorded';
		const leads = row.observed?.leadCreated ?? 0;
		return `${row.periodKey ?? 'period'} · ${leads} observed leads · sent ${row.sent ? 'yes' : 'no'} · published ${row.published ? 'yes' : 'no'}`;
	}

	function atLabel(value: Date | string) {
		const iso = value instanceof Date ? value.toISOString() : value;
		return iso.replace('T', ' ').slice(0, 16);
	}
</script>

<PageHeader
	eyebrow="Vector Intelligence"
	title="Autonomy"
	description="Low-risk classes can become eligible for Level 3 auto-execute. Policy still decides. Kill switch always wins. Confidence cannot authorize, unpause, or raise a ceiling. S1 can auto-execute an internal weekly report from observed tenant metrics only — it does not send, publish, or go live."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}
{#if form?.notice}
	<Alert tone="info">{form.notice}</Alert>
{/if}

{#if data.needsClient || !overview}
	<section>
		<EmptyState title="Select a client on Overview first." />
	</section>
{:else}
	<section>
		<h2>Kill switch</h2>
		<p>
			<StatusChip
				label={overview.pausedGlobal || overview.settings.paused ? 'paused' : 'ready'}
				tone={overview.pausedGlobal || overview.settings.paused ? 'danger' : 'success'}
			/>
			Client pause: {overview.settings.paused ? 'on' : 'off'}. Platform pause:
			{overview.pausedGlobal ? 'on' : 'off'} (env). Ceiling: {overview.settings.autonomyCeiling}
			(max {overview.phase8MaxAutonomy}; AI drafts stay at {overview.phase4MaxAutonomy}).
		</p>
		<p>
			Succeeded executions: {overview.executedCount}. S1 records an internal weekly report only.
			Other preapproved classes stay ineligible to run until later slices.
		</p>
		{#if canManage}
			<form method="post" action="?/pause" class="wide">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Reason
					<textarea
						name="reason"
						required
						minlength="8"
						maxlength="400"
						rows="2"
						placeholder="Required for pause or resume. Privileged and audited."></textarea>
				</label>
				<div class="actions">
					<button type="submit" name="paused" value="true">Pause this client</button>
					<button type="submit" name="paused" value="false" class="secondary"
						>Resume this client</button
					>
				</div>
			</form>
			<form method="post" action="?/ceiling">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Autonomy ceiling
					<select name="autonomyCeiling" required>
						{#each [0, 1, 2, 3] as level (level)}
							<option value={level} selected={level === overview.settings.autonomyCeiling}>
								Level {level}
							</option>
						{/each}
					</select>
				</label>
				<button type="submit" class="secondary">Set ceiling</button>
			</form>
		{:else}
			<EmptyState title="You can read policies but cannot change pause or ceiling." />
		{/if}
	</section>

	<section>
		<h2>Action policies</h2>
		<p>
			Level 3 is only for preapproved low-risk classes. Legal, refund, DNS, domain, pricing,
			destructive data, ads, publish, send, and experiment promote cannot auto-execute. Launch draft
			generation stays later.
		</p>
		{#if overview.actions.length === 0}
			<EmptyState title="No action policies seeded." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Action</th>
						<th>Risk</th>
						<th>Max</th>
						<th>Catalog</th>
						<th>This tenant</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.actions as action (action.id)}
						<tr>
							<td>
								<strong>{action.name}</strong>
								<br />
								{action.description}
							</td>
							<td>{action.riskClass}</td>
							<td>{action.maxAutonomy}</td>
							<td>
								<StatusChip
									label={action.forbidden
										? 'forbidden'
										: action.autoExecuteAllowed
											? 'preapproved'
											: 'approval required'}
									tone={action.forbidden
										? 'danger'
										: action.autoExecuteAllowed
											? 'success'
											: 'muted'}
								/>
							</td>
							<td>
								<StatusChip
									label={action.eligibleNow ? 'eligible now' : (action.blockedBy ?? 'blocked')}
									tone={gateTone(action.eligibleNow, action.blockedBy)}
								/>
								{#if canManage && action.executableNow}
									<form method="post" action="?/execute">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="actionType" value={action.actionType} />
										<button type="submit">Run now</button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Executions</h2>
		<p>
			Trusted software writes a tenant-scoped snapshot. It is not a send queue and not a publish
			path. Alpha executions never include Beta.
		</p>
		{#if overview.executions.length === 0}
			<EmptyState title="No auto-executions for this client." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>When</th>
						<th>Action</th>
						<th>Status</th>
						<th>Result</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.executions as execution (execution.id)}
						<tr>
							<td>{atLabel(execution.createdAt)}</td>
							<td>{execution.actionType}</td>
							<td>
								<StatusChip
									label={execution.status === 'blocked'
										? (execution.blockedBy ?? 'blocked')
										: execution.status}
									tone={executionTone(execution.status)}
								/>
							</td>
							<td>{reportLabel(execution.output)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Kill-switch audit</h2>
		<p>Client pause and resume are privileged. Alpha events never include Beta.</p>
		{#if overview.killSwitchEvents.length === 0}
			<EmptyState title="No kill-switch events for this client." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>When</th>
						<th>State</th>
						<th>Reason</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.killSwitchEvents as event (event.id)}
						<tr>
							<td>{atLabel(event.createdAt)}</td>
							<td>
								<StatusChip
									label={event.paused ? 'paused' : 'resumed'}
									tone={event.paused ? 'danger' : 'success'}
								/>
							</td>
							<td>{event.reason}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
{/if}
