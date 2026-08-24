<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('goals.manage'));
	const outcomes = $derived(data.outcomes);

	function healthTone(status: string) {
		if (status === 'healthy') return 'success' as const;
		if (status === 'warning') return 'warning' as const;
		if (status === 'broken') return 'danger' as const;
		return 'muted' as const;
	}

	function notificationLabel(topic: string) {
		if (topic === 'high_intent_lead') return 'High-intent lead';
		if (topic === 'data_health_alert') return 'Data health alert';
		if (topic === 'weekly_digest') return 'Weekly digest';
		return topic;
	}
</script>

<PageHeader
	eyebrow="Outcomes"
	title="Goals"
	description="Set the primary business target for this client. Data health flags a broken tracking source. Notification defaults are recorded here; they do not send mail by themselves."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}

{#if data.needsClient}
	<section>
		<EmptyState title="Select a client on Overview first." />
	</section>
{:else if !outcomes}
	<Alert>Goals could not be loaded.</Alert>
{:else}
	<section>
		<h2>Primary goal</h2>
		{#if outcomes.primary}
			<p>{outcomes.primary.name}</p>
			<p>
				Target: {outcomes.primary.targetValue}
				{outcomes.primary.unit}
				{#if outcomes.primary.currency}
					({outcomes.primary.currency})
				{/if}
				per {outcomes.primary.period}
			</p>
			<StatusChip label="primary" tone="success" />
		{:else}
			<EmptyState
				title="No primary goal yet."
				detail="A paying client needs one named target before the site is treated as commercially ready."
			/>
		{/if}
		{#if outcomes.goals.length > 0}
			<table>
				<thead>
					<tr>
						<th>Goal</th>
						<th>Type</th>
						<th>Target</th>
						<th>Period</th>
					</tr>
				</thead>
				<tbody>
					{#each outcomes.goals as goal (goal.id)}
						<tr>
							<td>
								{goal.name}
								{#if goal.isPrimary}
									<StatusChip label="primary" tone="info" />
								{/if}
							</td>
							<td>{goal.goalType.replaceAll('_', ' ')}</td>
							<td>
								{goal.targetValue}
								{goal.unit}
							</td>
							<td>{goal.period}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form class="wide" method="post" action="?/saveGoal">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Name
					<input name="name" required maxlength="120" value="Qualified leads" />
				</label>
				<label>
					Type
					<select name="goalType" required>
						<option value="qualified_leads">Qualified leads</option>
						<option value="sales">Sales</option>
						<option value="revenue">Revenue</option>
						<option value="bookings">Bookings</option>
						<option value="appointments">Appointments</option>
						<option value="custom">Custom</option>
					</select>
				</label>
				<label>
					Target
					<input name="targetValue" type="number" min="1" step="1" required value="8" />
				</label>
				<label>
					Unit
					<input name="unit" required maxlength="40" value="qualified leads" />
				</label>
				<label>
					Currency (revenue only)
					<input name="currency" maxlength="3" placeholder="USD" />
				</label>
				<label>
					Period
					<select name="period" required>
						<option value="month">Month</option>
						<option value="quarter">Quarter</option>
						<option value="year">Year</option>
					</select>
				</label>
				<label>
					Start
					<input name="startOn" type="date" />
				</label>
				<label>
					End
					<input name="endOn" type="date" />
				</label>
				<label>
					<input name="isPrimary" type="checkbox" checked />
					This is the primary goal
				</label>
				<button type="submit">Save goal</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Data health</h2>
		<p>
			These checks do not invent revenue. A broken source must be visible before recommendations.
		</p>
		{#if outcomes.health.length === 0}
			<EmptyState title="No health checks yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Check</th>
						<th>Status</th>
						<th>Detail</th>
					</tr>
				</thead>
				<tbody>
					{#each outcomes.health as check (check.id)}
						<tr>
							<td>{check.checkKey.replaceAll('_', ' ')}</td>
							<td>
								<StatusChip label={check.status} tone={healthTone(check.status)} />
							</td>
							<td>{check.detail}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Notifications</h2>
		<p>High-intent leads and data-health alerts default on. Weekly digest defaults off.</p>
		{#each outcomes.notifications as preference (preference.id)}
			<div class="meta">
				<p>{notificationLabel(preference.topic)}</p>
				<StatusChip
					label={preference.enabled ? 'on' : 'off'}
					tone={preference.enabled ? 'success' : 'muted'}
				/>
				{#if canManage}
					<form method="post" action="?/saveNotification">
						<input type="hidden" name="_csrf" value={data.csrf} />
						<input type="hidden" name="topic" value={preference.topic} />
						{#if !preference.enabled}
							<input type="hidden" name="enabled" value="on" />
							<button type="submit">Turn on</button>
						{:else}
							<button type="submit">Turn off</button>
						{/if}
					</form>
				{/if}
			</div>
		{/each}
	</section>
{/if}
