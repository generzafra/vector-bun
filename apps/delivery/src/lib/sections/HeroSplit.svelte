<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';

	let { section }: { section: Extract<PageSection, { type: 'hero-split' }> } = $props();
</script>

<section class="hero-split">
	<div>
		{#if section.eyebrow}
			<p class="eyebrow">{section.eyebrow}</p>
		{/if}
		<h1>{section.headline}</h1>
		<p class="lede">{section.lede}</p>
		<p>
			<a class="cta" href={section.primaryCta.href}>{section.primaryCta.label}</a>
		</p>
	</div>
	<aside class="aside">
		<h2>{section.asideTitle}</h2>
		<p>{section.asideBody}</p>
	</aside>
</section>
