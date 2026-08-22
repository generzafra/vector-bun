<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';

	let { section }: { section: Extract<PageSection, { type: 'cta' }> } = $props();
</script>

<section class="cta-block">
	<h2>{section.heading}</h2>
	<p class="section-body">{section.body}</p>
	<p>
		<a class="cta" href={section.primaryCta.href}>{section.primaryCta.label}</a>
	</p>
</section>
