<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';

	let { section }: { section: Extract<PageSection, { type: 'faq' }> } = $props();
</script>

<section class="faq">
	<h2>{section.heading}</h2>
	{#each section.items as item (item.question)}
		<details>
			<summary>{item.question}</summary>
			<p>{item.answer}</p>
		</details>
	{/each}
</section>
