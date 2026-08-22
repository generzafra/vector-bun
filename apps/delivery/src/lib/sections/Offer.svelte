<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';

	let { section }: { section: Extract<PageSection, { type: 'offer' }> } = $props();
</script>

<section class="offer">
	<h2>{section.heading}</h2>
	<h3>{section.name}</h3>
	<p class="section-body">{section.summary}</p>
	{#if section.priceLabel}
		<p>{section.priceLabel}</p>
	{/if}
</section>
