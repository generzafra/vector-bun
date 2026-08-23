<script lang="ts">
	import {
		EXPERIMENT_DECISION_OUTCOMES,
		EXPERIMENT_DECISION_RULES,
		EXPERIMENT_GUARDRAIL_METRICS,
		EXPERIMENT_PRIMARY_METRICS,
		EXPERIMENT_ROLLBACK_RULES
	} from '@vector/contracts';
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('experiments.manage'));
	const overview = $derived(data.overview);
	const publishedVersionCount = $derived(overview?.versions.length ?? 0);

	function versionLabel(version: { path: string; version: number }) {
		return `${version.path} · v${version.version}`;
	}

	function experimentTone(status: string) {
		if (status === 'decided' || status === 'approved' || status === 'running')
			return 'success' as const;
		if (status === 'paused') return 'warning' as const;
		if (status === 'proposed') return 'info' as const;
		return 'muted' as const;
	}

	function transitionLabel(status: string, to: string) {
		if (to === 'paused') return 'Pause';
		if (to === 'running' && status === 'approved') return 'Start';
		if (status === 'paused') return 'Resume';
		if (to === 'approved') return 'Approve';
		return `Mark ${to}`;
	}

	function reasonLabel(reason: string) {
		if (reason === 'not_launched') return 'Not launched';
		if (reason === 'horizon_unmet') return 'Horizon unmet';
		if (reason === 'sample_unmet') return 'Sample unmet';
		if (reason === 'bot_contamination') return 'Bot contamination';
		if (reason === 'source_imbalance') return 'Source imbalance';
		return reason;
	}
</script>

<PageHeader
	eyebrow="Conversion"
	title="Experiments"
	description="Record a governed proposal before anyone sees a variant. Fields lock after it is recorded. Approve does not start assignment. Start gives visitors a sticky published-page variant. Measurement uses predetermined metrics only. A decision and learning object are recorded only when policy is ready. A higher percentage on a tiny sample is not a win."
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
		<h2>Rules</h2>
		<p>
			Variants stay on immutable published page versions and must still pass the public frontend
			standard. Vector Control identity is not copied onto tenant pages. Primary metric, variants,
			guardrails, and sample rules lock after the proposal is recorded. Approve does not expose a
			variant. Start begins sticky assignment on Delivery. Pause stops exposure and keeps the page
			and primary metric reserved. Qualified-lead and revenue metrics stay closed until coverage
			exists. Preview traffic is test traffic and is not a production result. Measurement excludes
			bots and test traffic. Source imbalance and an unmet horizon or sample block a decision. Early
			stop is not allowed. Promote the challenger only when the predetermined primary count is
			higher and policy is ready. Level 4 auto-promote lives on <a href="/autonomy">Autonomy</a> and still
			uses these rules. One client's learning is not a global visual rule.
		</p>
	</section>

	<section>
		<h2>This client's proposals</h2>
		{#if overview.experiments.length === 0}
			<EmptyState
				title="No experiment proposals yet."
				detail="Publish two page versions on Funnel, then record a hypothesis here."
			/>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Status</th>
						<th>Primary metric</th>
						<th>Min days</th>
						<th>Min sample</th>
						<th>Variants</th>
						<th>Decision</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.experiments as experiment (experiment.id)}
						<tr>
							<td>{experiment.name}</td>
							<td>
								<StatusChip label={experiment.status} tone={experimentTone(experiment.status)} />
							</td>
							<td>{experiment.primaryMetric}</td>
							<td>{experiment.minDurationDays}</td>
							<td>{experiment.minSamplePerVariant}</td>
							<td>
								{#each experiment.variants as variant (variant.id)}
									<StatusChip label={`${variant.role}: ${variant.name}`} tone="muted" />
								{/each}
							</td>
							<td>
								{#if !experiment.launchedAt}
									<StatusChip label="Not started" tone="muted" />
								{:else if experiment.measurement?.decisionReady}
									<StatusChip label="Ready" tone="success" />
								{:else}
									<StatusChip label="Early stop blocked" tone="warning" />
								{/if}
							</td>
							<td>
								{#if canManage}
									{#each experiment.nextStatuses as next (next)}
										<form method="post" action="?/transition">
											<input type="hidden" name="_csrf" value={data.csrf} />
											<input type="hidden" name="id" value={experiment.id} />
											<input type="hidden" name="to" value={next} />
											<button type="submit">{transitionLabel(experiment.status, next)}</button>
										</form>
									{/each}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	{#if overview.experiments.some((row) => row.launchedAt)}
		<section>
			<h2>Measurement</h2>
			<p>
				Counts are observed on predetermined metrics. Test traffic and bots are excluded. A higher
				count is not a winner. Record a decision only when the row is ready.
			</p>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Horizon</th>
						<th>Sample</th>
						<th>Primary counts</th>
						<th>Guardrails</th>
						<th>Blocked because</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.experiments.filter((row) => row.launchedAt) as experiment (experiment.id)}
						<tr>
							<td>{experiment.name}</td>
							<td>
								<StatusChip
									label={experiment.measurement?.horizonMet ? 'Met' : 'Unmet'}
									tone={experiment.measurement?.horizonMet ? 'success' : 'warning'}
								/>
							</td>
							<td>
								control {experiment.measurement?.controlSample ?? 0} / {experiment.minSamplePerVariant}
								· challenger {experiment.measurement?.challengerSample ?? 0} / {experiment.minSamplePerVariant}
							</td>
							<td>
								{experiment.primaryMetric}: control {experiment.measurement?.controlPrimaryCount ??
									0}
								· challenger {experiment.measurement?.challengerPrimaryCount ?? 0}
							</td>
							<td>
								<StatusChip
									label={experiment.measurement?.botContamination
										? 'Bot contamination'
										: 'Bots clear'}
									tone={experiment.measurement?.botContamination ? 'danger' : 'muted'}
								/>
								<StatusChip
									label={experiment.measurement?.sourceImbalance
										? 'Source imbalance'
										: 'Sources balanced'}
									tone={experiment.measurement?.sourceImbalance ? 'danger' : 'muted'}
								/>
							</td>
							<td>
								{#if experiment.measurement?.reasons.length}
									{#each experiment.measurement.reasons as reason (reason)}
										<StatusChip label={reasonLabel(reason)} tone="warning" />
									{/each}
								{:else}
									<StatusChip label="None" tone="muted" />
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}

	{#if canManage && overview.experiments.some((row) => row.canDecide)}
		<section>
			<h2>Record a decision</h2>
			<p>
				Policy decides. Horizon, sample, bots, and source mix must already pass. Promoting the
				challenger points this client's published page at that already-published version.
			</p>
			{#each overview.experiments.filter((row) => row.canDecide) as experiment (experiment.id)}
				<form class="wide" method="post" action="?/decide">
					<input type="hidden" name="_csrf" value={data.csrf} />
					<input type="hidden" name="id" value={experiment.id} />
					<p>{experiment.name}</p>
					<label>
						Outcome
						<select name="outcome" required>
							{#each EXPERIMENT_DECISION_OUTCOMES as outcome (outcome)}
								<option value={outcome}>{outcome}</option>
							{/each}
						</select>
					</label>
					<label>
						Notes
						<textarea name="notes" required maxlength="800"></textarea>
					</label>
					<button type="submit">Record decision</button>
				</form>
			{/each}
		</section>
	{/if}

	{#if overview.experiments.some((row) => row.learning)}
		<section>
			<h2>Learning objects</h2>
			<p>
				Validated outcomes only. Confidence is measured. This is evidence for this client, not a
				universal style rule.
			</p>
			<table>
				<thead>
					<tr>
						<th>Client</th>
						<th>Hypothesis</th>
						<th>Result</th>
						<th>Decision</th>
						<th>Confidence</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.experiments.filter((row) => row.learning) as experiment (experiment.id)}
						<tr>
							<td>{experiment.learning?.clientLabel}</td>
							<td>{experiment.learning?.hypothesis}</td>
							<td>{experiment.learning?.result}</td>
							<td>
								<StatusChip label={experiment.learning?.decision ?? ''} tone="success" />
							</td>
							<td>
								<StatusChip label={experiment.learning?.confidence ?? ''} tone="info" />
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}

	{#if canManage}
		<section>
			<h2>Record a proposal</h2>
			{#if publishedVersionCount < 2}
				<EmptyState
					title="This page needs two published versions."
					detail="Compose and publish a challenger on Funnel before recording a proposal."
				/>
			{/if}
			<form class="wide" method="post" action="?/create">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Name
					<input name="name" required maxlength="160" />
				</label>
				<label>
					Problem
					<textarea name="problem" required maxlength="800"></textarea>
				</label>
				<label>
					Evidence
					<textarea name="evidence" required maxlength="800"></textarea>
				</label>
				<label>
					Hypothesis
					<textarea name="hypothesis" required maxlength="800"></textarea>
				</label>
				<label>
					Audience
					<textarea name="audience" required maxlength="400"></textarea>
				</label>
				<label>
					Page
					<select name="pageId" required>
						{#each overview.pages as page (page.id)}
							<option value={page.id}>{page.path} · {page.title}</option>
						{/each}
					</select>
				</label>
				<label>
					Control version
					<select name="controlPageVersionId" required>
						{#each overview.versions as version, index (version.id)}
							<option value={version.id} selected={index === 0}>{versionLabel(version)}</option>
						{/each}
					</select>
				</label>
				<label>
					Challenger version
					<select name="challengerPageVersionId" required>
						{#each overview.versions as version, index (version.id)}
							<option value={version.id} selected={index === 1}>{versionLabel(version)}</option>
						{/each}
					</select>
				</label>
				<label>
					Challenger name
					<input name="challengerName" maxlength="120" value="Challenger" />
				</label>
				<label>
					Primary metric
					<select name="primaryMetric" required>
						{#each EXPERIMENT_PRIMARY_METRICS as metric (metric)}
							<option value={metric}>{metric}</option>
						{/each}
					</select>
				</label>
				<fieldset>
					<legend>Guardrail metrics</legend>
					{#each EXPERIMENT_GUARDRAIL_METRICS as metric (metric)}
						<label>
							<input type="checkbox" name="guardrailMetrics" value={metric} />
							{metric}
						</label>
					{/each}
				</fieldset>
				<label>
					Minimum duration (days)
					<input name="minDurationDays" type="number" min="7" max="90" value="14" required />
				</label>
				<label>
					Minimum sample per variant
					<input
						name="minSamplePerVariant"
						type="number"
						min="100"
						max="100000"
						value="400"
						required
					/>
				</label>
				<label>
					Decision rule
					<select name="decisionRule">
						{#each EXPERIMENT_DECISION_RULES as rule (rule)}
							<option value={rule}>{rule}</option>
						{/each}
					</select>
				</label>
				<label>
					Rollback rule
					<select name="rollbackRule">
						{#each EXPERIMENT_ROLLBACK_RULES as rule (rule)}
							<option value={rule}>{rule}</option>
						{/each}
					</select>
				</label>
				<button type="submit" disabled={publishedVersionCount < 2}>Record proposal</button>
			</form>
		</section>
	{/if}
{/if}

<style>
	fieldset {
		display: grid;
		gap: var(--vector-space-2);
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend {
		margin-bottom: var(--vector-space-1);
		color: var(--text-secondary);
		font-size: 0.92rem;
	}

	fieldset label {
		display: flex;
		align-items: center;
		gap: var(--vector-space-2);
	}

	fieldset input {
		width: auto;
		min-height: 0;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
