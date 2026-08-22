<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import RecommendationCard from '$lib/vector/RecommendationCard.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('ai.manage'));
	const overview = $derived(data.overview);
	const pending = $derived(
		(overview?.approvals ?? [])
			.filter((row) => row.status === 'pending')
			.map((approval) => {
				const decision = overview?.decisions.find((item) => item.id === approval.decisionId);
				const cost = overview?.costs.find((item) => item.runId === approval.runId);
				return { approval, decision, cost };
			})
	);

	function costLabel(micros: number | undefined) {
		if (micros === undefined) return '—';
		return `$${(micros / 1_000_000).toFixed(6)}`;
	}

	function runTone(status: string) {
		if (status === 'succeeded') return 'success' as const;
		if (status === 'failed') return 'danger' as const;
		if (status === 'paused') return 'warning' as const;
		return 'muted' as const;
	}

	function atLabel(value: Date | string) {
		const iso = value instanceof Date ? value.toISOString() : value;
		return iso.replace('T', ' ').slice(0, 16);
	}
</script>

<PageHeader
	eyebrow="Vector Intelligence"
	title="Intelligence"
	description="Agents research, draft, and recommend. Approving funnel or copy writes an unpublished page draft only. Nothing publishes, sends, or goes live. Confidence cannot approve an action or override a pause."
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
		<h2>Status</h2>
		<p>
			<StatusChip
				label={overview.pausedGlobal || overview.settings.paused ? 'paused' : 'ready'}
				tone={overview.pausedGlobal || overview.settings.paused ? 'danger' : 'success'}
			/>
			Provider: {overview.provider.adapter} — {overview.provider.detail}
		</p>
		<p>
			Client pause: {overview.settings.paused ? 'on' : 'off'}. Platform pause:
			{overview.pausedGlobal ? 'on' : 'off'}. Autonomy ceiling: {overview.settings.autonomyCeiling}
			(Phase 4 max {overview.phase4MaxAutonomy}).
		</p>
		<p>Cost ledger: {overview.costTotalLabel} USD micros recorded for this tenant.</p>
		{#if canManage}
			<div class="actions">
				<form method="post" action="?/pause">
					<input type="hidden" name="_csrf" value={data.csrf} />
					<input type="hidden" name="paused" value="true" />
					<button type="submit" class="secondary">Pause this client</button>
				</form>
				<form method="post" action="?/pause">
					<input type="hidden" name="_csrf" value={data.csrf} />
					<input type="hidden" name="paused" value="false" />
					<button type="submit" class="secondary">Resume this client</button>
				</form>
			</div>
		{/if}
	</section>

	<section>
		<h2>Run a draft</h2>
		<p>
			Research, copy, analytics, and funnel plans stay recommendations until an operator decides.
			Approving funnel or copy writes an unpublished page version from the composer. Copy cannot
			include HTML. Funnel plans use approved section types only.
		</p>
		{#if canManage}
			<form method="post" action="?/run" class="wide">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Agent
					<select name="agentKey" required>
						{#each overview.agents as agent (agent.id)}
							<option value={agent.key}>{agent.name}</option>
						{/each}
					</select>
				</label>
				<label>
					Brief
					<textarea name="brief" rows="3" maxlength="2000" placeholder="Optional operator brief"
					></textarea>
				</label>
				<button type="submit">Draft recommendation</button>
			</form>
		{:else}
			<EmptyState title="You can read recommendations but cannot start a run." />
		{/if}
	</section>

	<section>
		<h2>Approval queue</h2>
		{#if pending.length === 0}
			<EmptyState
				title="No pending recommendations."
				detail="Successful runs appear here until an operator approves or rejects. Approving funnel or copy writes an unpublished draft. It still does not publish, send, or go live."
			/>
		{:else}
			<div class="queue">
				{#each pending as item (item.approval.id)}
					<RecommendationCard
						finding={item.decision?.finding ?? item.approval.summary}
						evidence={item.decision?.evidence ?? 'No evidence recorded.'}
						proposedAction={item.decision?.proposedAction ?? item.approval.summary}
						expectedImpact={item.decision?.expectedImpact ?? 'Not estimated.'}
						confidence={item.decision?.confidence ?? 0}
						risk={item.decision?.riskClass ?? item.approval.riskClass}
						cost={costLabel(item.cost?.costMicros)}
						approvalRequired={item.approval.required}
						status={item.approval.status}
					>
						{#if canManage}
							<form method="post" action="?/decide">
								<input type="hidden" name="_csrf" value={data.csrf} />
								<input type="hidden" name="id" value={item.approval.id} />
								<input type="hidden" name="decision" value="approved" />
								<button type="submit">Approve draft</button>
							</form>
							<form method="post" action="?/decide">
								<input type="hidden" name="_csrf" value={data.csrf} />
								<input type="hidden" name="id" value={item.approval.id} />
								<input type="hidden" name="decision" value="rejected" />
								<button type="submit" class="secondary">Reject</button>
							</form>
						{/if}
					</RecommendationCard>
				{/each}
			</div>
		{/if}
	</section>

	<section>
		<h2>Unpublished drafts</h2>
		<p>
			Approved funnel and copy artifacts stay drafts. Preview remains noindex. Publication is a
			separate operator action.
		</p>
		{#if overview.artifacts.length === 0}
			<EmptyState title="No unpublished page drafts from approvals." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Agent</th>
						<th>Version</th>
						<th>Status</th>
						<th>noindex</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.artifacts as artifact (artifact.pageVersionId)}
						<tr>
							<td>{artifact.agentKey}</td>
							<td>{artifact.version}</td>
							<td>
								<StatusChip
									label={artifact.status}
									tone={artifact.status === 'draft' ? 'warning' : 'muted'}
								/>
							</td>
							<td>{artifact.noindex ? 'yes' : 'no'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Activity</h2>
		{#if overview.activity.length === 0}
			<EmptyState title="No intelligence activity for this client." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>When</th>
						<th>Kind</th>
						<th>Summary</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.activity as item (item.id)}
						<tr>
							<td>{atLabel(item.at)}</td>
							<td>{item.kind}</td>
							<td>{item.summary}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Runs</h2>
		{#if overview.runs.length === 0}
			<EmptyState title="No AI runs for this client." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Agent</th>
						<th>Status</th>
						<th>Provider</th>
						<th>Model</th>
						<th>Schema</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.runs as run (run.id)}
						<tr>
							<td>{run.agentKey}</td>
							<td>
								<StatusChip label={run.status} tone={runTone(run.status)} />
							</td>
							<td>{run.provider}</td>
							<td>{run.model}</td>
							<td>{run.schemaName}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Cost ledger</h2>
		{#if overview.costs.length === 0}
			<EmptyState title="No cost events." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Provider</th>
						<th>Model</th>
						<th>Tokens</th>
						<th>Cost</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.costs as event (event.id)}
						<tr>
							<td>{event.provider}</td>
							<td>{event.model}</td>
							<td>{event.totalTokens}</td>
							<td>{costLabel(event.costMicros)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
{/if}

<style>
	.queue {
		display: grid;
		gap: var(--vector-space-4);
	}

	textarea {
		width: 100%;
	}
</style>
