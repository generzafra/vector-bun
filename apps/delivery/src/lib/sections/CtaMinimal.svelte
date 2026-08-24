<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';
	import { emitDeliveryEvent } from '$lib/track';

	let { section }: { section: Extract<PageSection, { type: 'cta-minimal' }> } = $props();
</script>

<section class="cta-minimal">
	<h2>{section.heading}</h2>
	<p class="section-body">{section.body}</p>
	<p>
		<a
			class="cta cta-quiet"
			href={section.primaryCta.href}
			onclick={() => emitDeliveryEvent('cta_clicked')}
		>
			{section.primaryCta.label}
		</a>
	</p>
</section>
