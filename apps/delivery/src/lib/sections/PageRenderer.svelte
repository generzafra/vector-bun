<script lang="ts">
	import type { PageDocument } from '@vector/funnel-engine';
	import Cta from './Cta.svelte';
	import Faq from './Faq.svelte';
	import HeroMinimal from './HeroMinimal.svelte';
	import HeroSplit from './HeroSplit.svelte';
	import LeadForm from './LeadForm.svelte';
	import Offer from './Offer.svelte';
	import Proof from './Proof.svelte';
	import Services from './Services.svelte';

	let {
		document,
		form
	}: {
		document: PageDocument;
		form?: { accepted?: boolean; error?: string } | null;
	} = $props();
</script>

{#each document.sections as section (section.id)}
	{#if section.type === 'hero-minimal'}
		<HeroMinimal {section} />
	{:else if section.type === 'hero-split'}
		<HeroSplit {section} />
	{:else if section.type === 'proof'}
		<Proof {section} />
	{:else if section.type === 'services'}
		<Services {section} />
	{:else if section.type === 'offer'}
		<Offer {section} />
	{:else if section.type === 'cta'}
		<Cta {section} />
	{:else if section.type === 'faq'}
		<Faq {section} />
	{:else if section.type === 'lead-form'}
		<LeadForm {section} {form} />
	{/if}
{/each}
