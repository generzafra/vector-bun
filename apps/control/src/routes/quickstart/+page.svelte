<script lang="ts">
	import { untrack } from 'svelte';
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('goals.manage'));
	const saved = $derived(data.quickstart);
	const seed = untrack(() => data.quickstart);
	let goalChoice = $state(seed?.goalChoice ?? 'qualified_leads');
	let hasTarget = $state(seed?.hasTarget ? 'yes' : 'no');
	let goodLead = $state(seed?.goodLead ?? 'inquiry');
	let afterContact = $state(seed?.afterContact ?? 'call');
	let sale = $state(seed?.sale ?? 'paid');
	let crm = $state(seed?.crm ?? 'later');
	let notifyHighIntent = $state(seed?.notifyHighIntent === false ? 'no' : 'yes');
	let approver = $state(seed?.approver ?? 'self');
</script>

<PageHeader
	title="QuickStart"
	description="Seven short questions. You do not need to fill a Knowledge encyclopedia. Revenue can wait."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}
{#if form?.ok}
	<Alert tone="info"
		>Saved. Vector will use these answers for goals, alerts, and who approves work.</Alert
	>
{/if}

{#if data.needsClient}
	<section>
		<EmptyState title="Select a business on Overview first." />
	</section>
{:else if !canManage && saved}
	<section>
		<h2>Saved answers</h2>
		<p>Primary goal: {saved.goalChoice.replaceAll('_', ' ')}</p>
		<p>Good lead: {saved.goodLead.replaceAll('_', ' ')}</p>
		<p>After a lead contacts you: {saved.afterContact.replaceAll('_', ' ')}</p>
		<p>A sale: {saved.sale}</p>
		<p>CRM or booking: {saved.crm}</p>
		<p>High-intent alerts: {saved.notifyHighIntent ? 'on' : 'off'}</p>
		<p>Who approves: {saved.approver}</p>
	</section>
{:else if !canManage}
	<section>
		<EmptyState
			title="You can view this later."
			detail="An owner or marketer needs to answer these questions."
		/>
	</section>
{:else}
	<form class="wide" method="post" action="?/save">
		<input type="hidden" name="_csrf" value={data.csrf} />

		<fieldset>
			<legend>What would you most like Vector to improve?</legend>
			<label>
				<input
					type="radio"
					name="goalChoice"
					value="qualified_leads"
					bind:group={goalChoice}
					required
				/>
				More qualified leads
			</label>
			<label>
				<input type="radio" name="goalChoice" value="bookings" bind:group={goalChoice} />
				More bookings
			</label>
			<label>
				<input type="radio" name="goalChoice" value="sales" bind:group={goalChoice} />
				More sales
			</label>
			<label>
				<input type="radio" name="goalChoice" value="revenue" bind:group={goalChoice} />
				More revenue
			</label>
			<label>
				<input type="radio" name="goalChoice" value="subscriptions" bind:group={goalChoice} />
				More subscriptions
			</label>
			<label>
				<input type="radio" name="goalChoice" value="other" bind:group={goalChoice} />
				Other
			</label>
			{#if goalChoice === 'other'}
				<label>
					Describe it
					<input name="goalOther" maxlength="80" required value={saved?.goalOther ?? ''} />
				</label>
			{/if}
		</fieldset>

		<fieldset>
			<legend>Do you have a target?</legend>
			<label>
				<input type="radio" name="hasTarget" value="yes" bind:group={hasTarget} required />
				Yes
			</label>
			<label>
				<input type="radio" name="hasTarget" value="no" bind:group={hasTarget} />
				Not yet
			</label>
			{#if hasTarget === 'yes'}
				<label>
					Target (whole number)
					<input
						name="targetValue"
						type="number"
						min="1"
						step="1"
						required
						value={saved?.targetValue ?? 8}
					/>
				</label>
				<label>
					Period
					<select name="period" required>
						<option value="month" selected={saved?.period !== 'quarter' && saved?.period !== 'year'}
							>Each month</option
						>
						<option value="quarter" selected={saved?.period === 'quarter'}>Each quarter</option>
						<option value="year" selected={saved?.period === 'year'}>Each year</option>
					</select>
				</label>
				{#if goalChoice === 'revenue'}
					<label>
						Currency
						<input name="currency" maxlength="3" required value={saved?.currency ?? 'USD'} />
					</label>
				{/if}
			{/if}
		</fieldset>

		<fieldset>
			<legend>What counts as a good lead?</legend>
			<label>
				<input type="radio" name="goodLead" value="inquiry" bind:group={goodLead} required />
				They asked to hear from us
			</label>
			<label>
				<input type="radio" name="goodLead" value="fit" bind:group={goodLead} />
				They are a fit for what we sell
			</label>
			<label>
				<input type="radio" name="goodLead" value="booked" bind:group={goodLead} />
				They booked a time
			</label>
			<label>
				<input type="radio" name="goodLead" value="ready_to_buy" bind:group={goodLead} />
				They are ready to buy
			</label>
			<label>
				<input type="radio" name="goodLead" value="other" bind:group={goodLead} />
				Other
			</label>
			{#if goodLead === 'other'}
				<label>
					Describe it
					<input name="goodLeadOther" maxlength="80" required value={saved?.goodLeadOther ?? ''} />
				</label>
			{/if}
		</fieldset>

		<fieldset>
			<legend>What usually happens after someone becomes a lead?</legend>
			<label>
				<input type="radio" name="afterContact" value="call" bind:group={afterContact} required />
				We call them
			</label>
			<label>
				<input type="radio" name="afterContact" value="book" bind:group={afterContact} />
				They book an appointment
			</label>
			<label>
				<input type="radio" name="afterContact" value="quote" bind:group={afterContact} />
				We send a quote
			</label>
			<label>
				<input type="radio" name="afterContact" value="purchase_online" bind:group={afterContact} />
				They purchase online
			</label>
			<label>
				<input type="radio" name="afterContact" value="other" bind:group={afterContact} />
				Other
			</label>
			{#if afterContact === 'other'}
				<label>
					Describe it
					<input
						name="afterContactOther"
						maxlength="80"
						required
						value={saved?.afterContactOther ?? ''}
					/>
				</label>
			{/if}
		</fieldset>

		<fieldset>
			<legend>What counts as a sale?</legend>
			<label>
				<input type="radio" name="sale" value="paid" bind:group={sale} required />
				They paid
			</label>
			<label>
				<input type="radio" name="sale" value="booked" bind:group={sale} />
				They booked the work
			</label>
			<label>
				<input type="radio" name="sale" value="signed" bind:group={sale} />
				They signed
			</label>
			<label>
				<input type="radio" name="sale" value="other" bind:group={sale} />
				Other
			</label>
			{#if sale === 'other'}
				<label>
					Describe it
					<input name="saleOther" maxlength="80" required value={saved?.saleOther ?? ''} />
				</label>
			{/if}
		</fieldset>

		<fieldset>
			<legend>Do you already use a CRM or booking system?</legend>
			<label>
				<input type="radio" name="crm" value="none" bind:group={crm} required />
				No — we keep it in Vector for now
			</label>
			<label>
				<input type="radio" name="crm" value="crm" bind:group={crm} />
				Yes, a CRM
			</label>
			<label>
				<input type="radio" name="crm" value="booking" bind:group={crm} />
				Yes, a booking tool
			</label>
			<label>
				<input type="radio" name="crm" value="later" bind:group={crm} />
				Not now — maybe later
			</label>
			{#if crm === 'crm' || crm === 'booking'}
				<label>
					Optional: what do you use?
					<input name="crmNote" maxlength="80" value={saved?.crmNote ?? ''} />
				</label>
			{/if}
		</fieldset>

		<fieldset>
			<legend>Would you like Vector to notify you immediately about high-intent leads?</legend>
			<label>
				<input
					type="radio"
					name="notifyHighIntent"
					value="yes"
					bind:group={notifyHighIntent}
					required
				/>
				Yes
			</label>
			<label>
				<input type="radio" name="notifyHighIntent" value="no" bind:group={notifyHighIntent} />
				No
			</label>
		</fieldset>

		<fieldset>
			<legend>Who approves campaigns?</legend>
			<label>
				<input type="radio" name="approver" value="self" bind:group={approver} required />
				I will
			</label>
			<label>
				<input type="radio" name="approver" value="other" bind:group={approver} />
				Someone else
			</label>
			<label>
				<input type="radio" name="approver" value="later" bind:group={approver} />
				We'll decide later
			</label>
			{#if approver === 'other'}
				<label>
					Who should approve?
					<input name="approverNote" maxlength="80" required value={saved?.approverNote ?? ''} />
				</label>
			{/if}
		</fieldset>

		<button type="submit">Save answers</button>
	</form>
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
		color: var(--vector-text-primary);
		font-weight: 600;
	}

	fieldset label {
		display: flex;
		align-items: center;
		gap: var(--vector-space-2);
		color: var(--text-secondary);
	}

	fieldset label:has(input:not([type='radio'])) {
		display: grid;
		gap: 0.35rem;
	}
</style>
