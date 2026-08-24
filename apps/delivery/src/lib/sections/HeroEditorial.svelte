<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';

	let { section }: { section: Extract<PageSection, { type: 'hero-editorial' }> } = $props();
</script>

<section class="hero-editorial">
	{#if section.eyebrow}
		<p class="eyebrow">{section.eyebrow}</p>
	{/if}
	<h1>{section.headline}</h1>
	<p class="lede">{section.lede}</p>
	<p>
		<a class="cta" href={section.primaryCta.href}>{section.primaryCta.label}</a>
	</p>
</section>
