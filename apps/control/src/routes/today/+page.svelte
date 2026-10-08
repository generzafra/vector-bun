<script lang="ts">
	import { hasOperatorControlNav } from '@vector/contracts';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data } = $props();
	const operatorNav = $derived(hasOperatorControlNav(data.permissions));
	const today = $derived(data.today);

	function evidenceLabel(evidenceClass: string) {
		return evidenceClass === 'observed' ? 'Observed' : 'Unknown';
	}

	function evidenceTone(evidenceClass: string) {
		return evidenceClass === 'observed' ? ('info' as const) : ('muted' as const);
	}
</script>

<PageHeader
	eyebrow={operatorNav ? 'Today' : 'Your day'}
	title="Today"
	description={today
		? `${today.label}. New leads, sales, what needs you, and work Vector recorded. No guessed revenue.`
		: 'A short view of today. Vector only shows what it recorded.'}
/>

{#if data.needsClient}
	<section>
		<EmptyState title="Select a business on Overview first." />
	</section>
{:else if !today}
	<section>
		<EmptyState title="Today needs access to leads or the work Vector sends." />
	</section>
{:else}
	<section>
		<h2>New leads</h2>
		<p>{today.newLeads.evidenceClass === 'observed' ? today.newLeads.count : 'Unknown'}</p>
		<p>{today.newLeads.detail}</p>
		<StatusChip label={evidenceLabel(today.newLeads.evidenceClass)} tone="info" />

		<h2>High-intent leads</h2>
		<p>{today.highIntent.evidenceClass === 'observed' ? today.highIntent.count : 'Unknown'}</p>
		<p>{today.highIntent.detail}</p>
		<StatusChip label={evidenceLabel(today.highIntent.evidenceClass)} tone="info" />

		<h2>Sales</h2>
		<p>{today.sales.evidenceClass === 'observed' ? today.sales.count : 'Unknown'}</p>
		<p>{today.sales.detail}</p>
		<StatusChip label={evidenceLabel(today.sales.evidenceClass)} tone="info" />

		<h2>Revenue</h2>
		<p>{today.revenue.evidenceClass === 'observed' ? 'Recorded' : 'Unknown'}</p>
		<p>{today.revenue.detail}</p>
		<StatusChip
			label={evidenceLabel(today.revenue.evidenceClass)}
			tone={evidenceTone(today.revenue.evidenceClass)}
		/>
	</section>

	<section>
		<h2>What needs you</h2>
		<p>{today.needsYou.detail}</p>
		{#if today.needsYou.items.length === 0}
			<EmptyState title="Nothing is waiting on you." />
		{:else}
			<ul>
				{#each today.needsYou.items as item (item.id)}
					<li>{item.detail}</li>
				{/each}
			</ul>
		{/if}
		<p><a href="/approvals">Open approvals</a></p>
	</section>

	<section>
		<h2>What Vector handled</h2>
		<p>{today.handled.detail}</p>
		{#if today.handled.items.length > 0}
			<ul>
				{#each today.handled.items as item (item.id)}
					<li>{item.detail}</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section>
		<h2>Important changes</h2>
		<p>{today.changes.detail}</p>
		<StatusChip label={evidenceLabel(today.changes.evidenceClass)} tone="muted" />
		<p><a href="/leads">Open leads</a></p>
	</section>
{/if}
