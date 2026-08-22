<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';

	let { section }: { section: Extract<PageSection, { type: 'services' }> } = $props();
</script>

<section class="services">
	<h2>{section.heading}</h2>
	{#each section.items as item (item.name)}
		<article class="service">
			<h3>{item.name}</h3>
			<p>{item.outcome}</p>
			<p>{item.summary}</p>
		</article>
	{/each}
</section>
