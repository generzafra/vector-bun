<script lang="ts">
	import PageRenderer from '$lib/sections/PageRenderer.svelte';

	let { data, form } = $props();
	const tokens = $derived(data.document.theme.tokens);
	const personality = $derived(data.document.theme.personality ?? 'corporate');
</script>

<svelte:head>
	<title>{data.document.seo.title}</title>
	<meta name="description" content={data.document.seo.description} />
	{#if data.document.seo.noindex || data.domainKind === 'preview'}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

<div
	class={['page', `page-${personality}`]}
	style:--bg={tokens.background ?? '#111'}
	style:--surface={tokens.surface ?? '#1a1a1a'}
	style:--text={tokens.text ?? '#f4f4f0'}
	style:--accent={tokens.accent ?? '#c4a35a'}
	style:--font={tokens.fontFamily ?? 'Georgia, Times New Roman, serif'}
>
	<a class="skip" href="#main">Skip to content</a>
	<header class="top">
		<p class="brand">{data.document.identity.displayName}</p>
		<a class="cta" href="#lead">{data.document.narrative.primaryConversion}</a>
	</header>
	<main id="main">
		<PageRenderer document={data.document} {form} />
	</main>
	{#if data.domainKind === 'preview'}
		<p class="preview-note">Private preview. Not indexed. Production email and social are off.</p>
	{/if}
</div>
