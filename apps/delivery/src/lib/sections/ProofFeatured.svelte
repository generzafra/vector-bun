<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';

	let { section }: { section: Extract<PageSection, { type: 'proof-featured' }> } = $props();
</script>

<section class="proof-featured">
	<h2>{section.heading}</h2>
	{#each section.items as item (item.statement)}
		<article class="proof-item">
			<p>{item.statement}</p>
			{#if item.evidence}
				<p>{item.evidence}</p>
			{/if}
		</article>
	{/each}
</section>
