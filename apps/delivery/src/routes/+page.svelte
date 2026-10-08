<script lang="ts">
	import { page } from '$app/state';
	import { motionClass, publicPageMeta } from '@vector/funnel-engine';
	import PageRenderer from '$lib/sections/PageRenderer.svelte';
	import { emitDeliveryEvent } from '$lib/track';

	let { data, form } = $props();
	const tokens = $derived(data.document.theme.tokens);
	const personality = $derived(data.document.theme.personality ?? 'corporate');
	const meta = $derived(
		publicPageMeta({
			title: data.document.seo.title,
			description: data.document.seo.description,
			origin: page.url.origin,
			domainKind: data.domainKind,
			pathname: data.pathname
		})
	);
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<meta name="robots" content={meta.robots} />
	{#if meta.canonical}
		<link rel="canonical" href={meta.canonical} />
	{/if}
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	{#if data.hasOgImage}
		<meta property="og:image" content={`${page.url.origin}/og-image`} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={`${page.url.origin}/og-image`} />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	{#if data.jsonLdHtml}
		{@html data.jsonLdHtml}
	{/if}
</svelte:head>

<div
	class={['page', `page-${personality}`, motionClass(data.document.theme.motionPreset)]}
	style:--bg={tokens.background ?? '#111'}
	style:--surface={tokens.surface ?? '#1a1a1a'}
	style:--text={tokens.text ?? '#f4f4f0'}
	style:--accent={tokens.accent ?? '#c4a35a'}
	style:--font={tokens.fontFamily ?? 'Georgia, Times New Roman, serif'}
>
	<a class="skip" href="#main">Skip to content</a>
	<header class="top">
		<nav aria-label="Page">
			{#if data.hasBrandLogo}
				<img class="brand-logo" src="/brand-logo" alt={data.document.identity.displayName} />
			{:else}
				<p class="brand">{data.document.identity.displayName}</p>
			{/if}
			<a class="cta" href="#lead" onclick={() => emitDeliveryEvent('cta_clicked')}>
				{data.document.narrative.primaryConversion}
			</a>
		</nav>
	</header>
	<main id="main">
		<PageRenderer document={data.document} {form} domainKind={data.domainKind} />
	</main>
	{#if data.domainKind === 'preview'}
		<p class="preview-note">Private preview. Not indexed. Production email and social are off.</p>
	{/if}
</div>
