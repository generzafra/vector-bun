<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import { VALUE_ACTIVITY_TYPES, formatMinorUnits, hasOperatorControlNav } from '@vector/contracts';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('goals.manage'));
	const operatorNav = $derived(hasOperatorControlNav(data.permissions));
	const proof = $derived(data.proof);

	function activityLabel(type: string) {
		if (type === 'lead_operations') return 'Lead work';
		if (type === 'website') return 'Website';
		if (type === 'content') return 'Content';
		if (type === 'social') return 'Social';
		if (type === 'email') return 'Email';
		if (type === 'reporting') return 'Reporting';
		return 'Other';
	}
</script>

<PageHeader
	eyebrow={operatorNav ? 'Client value' : undefined}
	title="What Vector did"
	description="Observed work this month. This is activity proof, not ROI."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}
{#if form?.ok}
	<Alert tone="info">Saved. Vector did not turn this into a return-on-investment claim.</Alert>
{/if}

{#if data.needsClient}
	<section>
		<EmptyState title="Select a business on Overview first." />
	</section>
{:else if !proof}
	<section>
		<EmptyState
			title="You can view this later."
			detail="An owner or operator can open activity proof."
		/>
	</section>
{:else}
	<section>
		<h2>Package fee</h2>
		{#if proof.profile}
			<p>{proof.profile.packageName}</p>
			<p>{formatMinorUnits(proof.profile.feeMinor, proof.profile.currency)} / month</p>
			<p>Recorded fee. Not a profit figure and not ROI.</p>
		{:else}
			<EmptyState
				title="Package fee is not recorded yet."
				detail="Vector will not invent a fee, hours saved, or ROI. Record the known package first."
			/>
		{/if}
		{#if canManage}
			<form method="post" action="?/profile">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Package name
					<input
						name="packageName"
						required
						maxlength="80"
						placeholder="Growth"
						value={proof.profile?.packageName ?? ''}
					/>
				</label>
				<label>
					Monthly fee (whole units)
					<input
						name="feeMajor"
						inputmode="numeric"
						pattern="[0-9]*"
						required
						placeholder="35000"
						value={proof.profile ? String(Math.trunc(proof.profile.feeMinor / 100)) : ''}
					/>
				</label>
				<label>
					Currency
					<input
						name="currency"
						required
						maxlength="3"
						placeholder="PHP"
						value={proof.profile?.currency ?? ''}
					/>
				</label>
				<button type="submit">Save package fee</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Previous monthly spend</h2>
		{#if proof.baseline}
			<p>{proof.baseline.stated} / month</p>
			<p>Version {proof.baseline.version}. Client-stated estimate. Not a measured result.</p>
			{#if proof.baseline.earlierVersions > 0}
				<p>Earlier versions stay on record.</p>
			{/if}
		{:else}
			<p>No previous spend has been stated. Vector will not invent one.</p>
		{/if}
		{#if canManage}
			<form method="post" action="?/baseline">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Previous monthly spend (whole units)
					<input name="previousMajor" inputmode="numeric" pattern="[0-9]*" placeholder="92000" />
				</label>
				<label>
					Currency
					<input
						name="currency"
						maxlength="3"
						placeholder="PHP"
						value={proof.baseline?.currency ?? proof.profile?.currency ?? ''}
					/>
				</label>
				<button type="submit">Save a new version</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Work delivered this month</h2>
		<p>
			{proof.counts.leads} leads · {proof.counts.salesOutcomes} sales outcomes · {proof.counts
				.emailsSent}
			emails sent · {proof.counts.socialPublished} social posts · {proof.counts.pagesPublished} published
			pages · {proof.counts.recordedActivities} recorded notes
		</p>
		<p>
			These counts are observed from this business. They are not replacement cost or time saved.
		</p>
	</section>

	<section>
		<h2>Leads and the main goal</h2>
		<p>Qualified leads this month: {proof.counts.qualifiedLeads} observed.</p>
		<p>Source coverage is {proof.leadValue.attributionEvidence}.</p>
		{#if proof.leadValue.goal}
			<p>{proof.leadValue.goal.name}</p>
			{#if proof.leadValue.goal.evidenceClass === 'observed'}
				<p>
					{proof.leadValue.goal.observedValue} of {proof.leadValue.goal.targetValue}
					{proof.leadValue.goal.unit}
				</p>
			{:else}
				<p>Unknown</p>
			{/if}
			<p>{proof.leadValue.goal.detail}</p>
		{:else}
			<p>No primary goal yet.</p>
		{/if}
		<p>Vector does not rank a channel from this.</p>
	</section>

	<section>
		<h2>Revenue and the package fee</h2>
		<p>{proof.revenueLink.detail}</p>
		<p>Replacement cost is not shown. This is not ROI.</p>
	</section>

	<section>
		<h2>Experiment difference</h2>
		<p>{proof.incremental.detail}</p>
	</section>

	<section>
		<h2>Recorded notes</h2>
		{#if proof.activities.length === 0}
			<EmptyState
				title="No extra notes this month."
				detail="Observed counts above still stand. Do not add hours or agency cost here."
			/>
		{:else}
			<ul class="meta">
				{#each proof.activities as row (row.id)}
					<li>
						<p>{activityLabel(row.activityType)} · {row.quantity}</p>
						<p>{row.description}</p>
					</li>
				{/each}
			</ul>
		{/if}
		{#if canManage}
			<form method="post" action="?/activity">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Kind of work
					<select name="activityType" required>
						{#each VALUE_ACTIVITY_TYPES as type (type)}
							<option value={type}>{activityLabel(type)}</option>
						{/each}
					</select>
				</label>
				<label>
					What happened
					<input name="description" required maxlength="200" placeholder="Published the homepage" />
				</label>
				<button type="submit">Record work</button>
			</form>
		{/if}
	</section>
{/if}
