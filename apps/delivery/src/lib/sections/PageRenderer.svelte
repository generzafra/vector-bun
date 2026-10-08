<script lang="ts">
	import { sectionFrameClass, type PageDocument } from '@vector/funnel-engine';
	import type { LeadFormState } from '$lib/lead-form';
	import Cta from './Cta.svelte';
	import CtaMinimal from './CtaMinimal.svelte';
	import Faq from './Faq.svelte';
	import HeroEditorial from './HeroEditorial.svelte';
	import HeroMinimal from './HeroMinimal.svelte';
	import HeroSplit from './HeroSplit.svelte';
	import LeadForm from './LeadForm.svelte';
	import Offer from './Offer.svelte';
	import Proof from './Proof.svelte';
	import ProofFeatured from './ProofFeatured.svelte';
	import Services from './Services.svelte';
	import ServicesEditorial from './ServicesEditorial.svelte';

	let {
		document,
		form,
		domainKind = 'preview'
	}: {
		document: PageDocument;
		form?: LeadFormState;
		domainKind?: 'preview' | 'production' | 'redirect';
	} = $props();
</script>

{#each document.sections as section (section.id)}
	<div class={sectionFrameClass(section)}>
		{#if section.type === 'hero-minimal'}
			<HeroMinimal {section} />
		{:else if section.type === 'hero-split'}
			<HeroSplit {section} />
		{:else if section.type === 'hero-editorial'}
			<HeroEditorial {section} />
		{:else if section.type === 'proof'}
			<Proof {section} />
		{:else if section.type === 'proof-featured'}
			<ProofFeatured {section} />
		{:else if section.type === 'services'}
			<Services {section} />
		{:else if section.type === 'services-editorial'}
			<ServicesEditorial {section} />
		{:else if section.type === 'offer'}
			<Offer {section} />
		{:else if section.type === 'cta'}
			<Cta {section} />
		{:else if section.type === 'cta-minimal'}
			<CtaMinimal {section} />
		{:else if section.type === 'faq'}
			<Faq {section} />
		{:else if section.type === 'lead-form'}
			<LeadForm {section} {form} {domainKind} />
		{/if}
	</div>
{/each}
