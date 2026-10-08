<script lang="ts">
	import { hasOperatorControlNav } from '@vector/contracts';
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const operatorNav = $derived(hasOperatorControlNav(data.permissions));
	const active = $derived(data.clients.find((client) => client.id === data.activeClientId) ?? null);
	const canSwitch = $derived(data.clients.length > 1);
	const overview = $derived(data.overview);

	function evidenceLabel(evidenceClass: string) {
		return evidenceClass === 'observed' ? 'Observed' : 'Unknown';
	}

	function evidenceTone(evidenceClass: string) {
		return evidenceClass === 'observed' ? ('info' as const) : ('muted' as const);
	}
</script>

<PageHeader
	eyebrow={operatorNav ? 'Workspace' : 'Your business'}
	title="Overview"
	description={operatorNav
		? 'Sales, qualified leads, and the primary goal for the active client. Unknown coverage stays unlabeled.'
		: 'Sales, qualified leads, and progress on the main goal. Vector does not fill in numbers it has not recorded.'}
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

{#if overview}
	<section>
		<h2>How this business is doing</h2>
		<h3>Qualified leads</h3>
		<p>
			{#if overview.qualified.evidenceClass === 'observed'}
				{overview.qualified.count}
			{:else}
				Unknown
			{/if}
		</p>
		<p>{overview.qualified.detail}</p>
		<StatusChip
			label={evidenceLabel(overview.qualified.evidenceClass)}
			tone={evidenceTone(overview.qualified.evidenceClass)}
		/>

		<h3>Sales</h3>
		<p>
			{#if overview.sales.evidenceClass === 'observed'}
				{overview.sales.count}
			{:else}
				Unknown
			{/if}
		</p>
		<p>{overview.sales.detail}</p>
		<StatusChip
			label={evidenceLabel(overview.sales.evidenceClass)}
			tone={evidenceTone(overview.sales.evidenceClass)}
		/>

		<h3>Revenue</h3>
		<p>{overview.revenue.evidenceClass === 'observed' ? 'Recorded' : 'Unknown'}</p>
		<p>{overview.revenue.detail}</p>
		<StatusChip
			label={evidenceLabel(overview.revenue.evidenceClass)}
			tone={evidenceTone(overview.revenue.evidenceClass)}
		/>
		{#if data.permissions.includes('outcomes.manage')}
			<form method="post" action="?/recordRevenue">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Amount
					<input name="amountMajor" inputmode="numeric" pattern="[0-9]*" required />
				</label>
				<label>
					Currency
					<input name="currency" maxlength="3" value="USD" required />
				</label>
				<label>
					Note
					<input name="note" />
				</label>
				<button type="submit">Record revenue</button>
			</form>
		{/if}

		<h3>Goal</h3>
		{#if !overview.goalsAvailable}
			<p>Goal progress needs goal access.</p>
		{:else if overview.goal}
			<p>{overview.goal.name}</p>
			<p>
				{#if overview.goal.evidenceClass === 'observed'}
					{overview.goal.observedValue} of {overview.goal.targetValue} {overview.goal.unit}
				{:else}
					Unknown
				{/if}
			</p>
			<p>{overview.goal.detail}</p>
			<StatusChip
				label={evidenceLabel(overview.goal.evidenceClass)}
				tone={evidenceTone(overview.goal.evidenceClass)}
			/>
		{:else}
			<EmptyState
				title="No primary goal yet."
				detail="Set one target so progress has a place to land."
			/>
			<p><a href="/goals">Set a goal</a></p>
		{/if}
		<p><a href="/leads">Open leads</a></p>
	</section>

	{#if data.permissions.includes('outcomes.read') || data.permissions.includes('outcomes.manage')}
		<section>
			<h2>Monthly review</h2>
			{#if data.reviews.length === 0}
				<p>No completed month is recorded yet.</p>
			{:else}
				{#each data.reviews as report (report.id)}
					<h3>{report.periodKey}</h3>
					<pre>{report.narrative}</pre>
				{/each}
			{/if}
			{#if data.permissions.includes('outcomes.manage')}
				<form method="post" action="?/recordReview">
					<input type="hidden" name="_csrf" value={data.csrf} />
					<button type="submit">Record last month</button>
				</form>
			{/if}
		</section>
	{/if}

	{#if overview.warnings.length > 0}
		<section>
			<h2>Data health</h2>
			{#each overview.warnings as warning (warning.checkKey)}
				<Alert tone="warning">{warning.detail}</Alert>
			{/each}
		</section>
	{:else if overview.trackingUnknown}
		<p>Tracking health is unknown.</p>
	{:else if overview.trackingHealthy}
		<p>The tracking sources Vector checked look healthy.</p>
	{/if}
{/if}

{#if data.activeClientId}
	<section>
		{#if data.quickstart}
			<p>QuickStart answers are saved for this business.</p>
			<p><a href="/quickstart">Review or update answers</a></p>
		{:else}
			<EmptyState
				title="Tell Vector what success looks like."
				detail="Seven short questions. You do not need to fill Knowledge."
			/>
			<p><a href="/quickstart">Start QuickStart</a></p>
		{/if}
		<p><a href="/value">See what Vector did this month</a></p>
		{#if data.brandVisualConfirmed}
			<p>Brand look is confirmed.</p>
			<p><a href="/brand">Review brand look</a></p>
		{:else if data.brandVisualConfirmed === false}
			<EmptyState
				title="Confirm how this brand should look."
				detail="Logo, colors, and visual style. Not a design questionnaire."
			/>
			<p><a href="/brand">Confirm brand look</a></p>
		{/if}
	</section>
{/if}

{#if data.activeClientId && (data.permissions.includes('goals.read') || data.permissions.includes('leads.read') || data.permissions.includes('outcomes.read'))}
	<section>
		<h2>Ask Vector</h2>
		<p>Ask a recorded question. Vector calculates the answer and does not add a figure.</p>
		{#if data.asks.length === 0}
			<p>No question yet.</p>
		{:else}
			<ul>
				{#each data.asks as turn (turn.id)}
					<li>
						<p>{turn.answer}</p>
						<p>{turn.evidenceClass}</p>
						{#if turn.explanation}
							<p>{turn.explanation}</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<form method="post" action="?/ask">
			<input type="hidden" name="_csrf" value={data.csrf} />
			<label>
				Question
				<select name="intent" required>
					{#if data.permissions.includes('goals.read')}
						<option value="goal_blocker">What is preventing the main goal?</option>
						<option value="data_health">Is tracking healthy?</option>
					{/if}
					{#if data.permissions.includes('leads.read')}
						<option value="qualified_leads">How many qualified leads are recorded?</option>
						<option value="source_coverage">What is the source coverage?</option>
					{/if}
					{#if data.permissions.includes('outcomes.read')}
						<option value="recorded_revenue">What revenue is recorded?</option>
					{/if}
				</select>
			</label>
			<button type="submit">Ask</button>
		</form>
	</section>
{/if}
