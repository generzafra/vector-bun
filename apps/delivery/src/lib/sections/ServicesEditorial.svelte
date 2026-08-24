<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';

	let { section }: { section: Extract<PageSection, { type: 'services-editorial' }> } = $props();
</script>

<section class="services-editorial">
	<h2>{section.heading}</h2>
	{#each section.items as item (item.name)}
		<article class="service">
			<div>
				<h3>{item.name}</h3>
				<p>{item.outcome}</p>
				<p>{item.summary}</p>
			</div>
		</article>
	{/each}
</section>
