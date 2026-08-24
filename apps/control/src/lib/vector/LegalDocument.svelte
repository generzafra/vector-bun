<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import type { InlineNode, LegalDocumentView } from '$lib/legal/parse';

	let {
		document,
		relatedHref,
		relatedLabel
	}: {
		document: LegalDocumentView;
		relatedHref: string;
		relatedLabel: string;
	} = $props();

	const description = $derived(
		document.kind === 'privacy'
			? 'How Vector collects, uses, and protects personal information.'
			: 'The agreement that governs access to and use of Vector services.'
	);

	const draftNotice =
		'This document is a draft for implementation and legal review. It is not a final policy until counsel approves it and remaining placeholders are replaced.';
</script>

{#snippet inlineNodes(nodes: InlineNode[])}
	{#each nodes as node, index (index)}
		{#if node.type === 'text'}
			{node.value}
		{:else if node.type === 'strong'}
			<strong>{node.value}</strong>
		{:else if node.type === 'link'}
			<a href={node.href}>{node.value}</a>
		{/if}
	{/each}
{/snippet}

<svelte:head>
	<title>{document.title} · Vector</title>
	<meta name="description" content={description} />
</svelte:head>

<article class="legal-doc">
	<PageHeader eyebrow="Vector legal" title={document.title} {description} />

	{#if document.draft}
		<Alert tone="warning">{draftNotice}</Alert>
	{/if}

	<dl class="meta">
		{#if document.status}
			<div>
				<dt>Status</dt>
				<dd>{document.status}</dd>
			</div>
		{/if}
		{#if document.businessLocation}
			<div>
				<dt>Business location</dt>
				<dd>{document.businessLocation}</dd>
			</div>
		{/if}
		{#if document.effectiveDate}
			<div>
				<dt>Effective date</dt>
				<dd>{document.effectiveDate}</dd>
			</div>
		{/if}
		{#if document.lastUpdated}
			<div>
				<dt>Last updated</dt>
				<dd>{document.lastUpdated}</dd>
			</div>
		{/if}
	</dl>

	{#if document.toc.length > 0}
		<nav class="toc" aria-label="On this page">
			<h2>On this page</h2>
			<ol>
				{#each document.toc as item (item.id)}
					<li><a href={`#${item.id}`}>{item.label}</a></li>
				{/each}
			</ol>
		</nav>
	{/if}

	<div class="body">
		{#each document.blocks as block, index (block.type === 'h2' || block.type === 'h3' ? block.id : index)}
			{#if block.type === 'h2'}
				<h2 id={block.id}>{block.text}</h2>
			{:else if block.type === 'h3'}
				<h3 id={block.id}>{block.text}</h3>
			{:else if block.type === 'p'}
				<p>{@render inlineNodes(block.children)}</p>
			{:else}
				<ol>
					{#each block.items as item, itemIndex (itemIndex)}
						<li>{@render inlineNodes(item)}</li>
					{/each}
				</ol>
			{/if}
		{/each}
	</div>

	<p class="related">
		Related: <a href={relatedHref}>{relatedLabel}</a>
	</p>
</article>

<style>
	.legal-doc {
		display: grid;
		gap: var(--vector-space-6);
		max-width: 52rem;
	}

	.meta {
		display: grid;
		gap: var(--vector-space-3);
		margin: 0;
	}

	.meta div {
		display: grid;
		gap: 0.15rem;
	}

	.meta dt {
		color: var(--text-tertiary);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.meta dd {
		margin: 0;
		color: var(--text-secondary);
	}

	.toc,
	.body {
		min-width: 0;
	}

	.toc {
		padding: var(--vector-space-5);
		border: 1px solid var(--vector-border);
		border-radius: var(--vector-radius-md);
		background: var(--vector-surface-panel);
	}

	.toc h2,
	.body h2 {
		margin: 0 0 var(--vector-space-3);
		font-size: 1.05rem;
		scroll-margin-top: var(--vector-space-8);
	}

	.toc ol {
		columns: 2;
		gap: var(--vector-space-6);
		margin: 0;
		padding-left: 1.2rem;
		color: var(--text-secondary);
	}

	.toc a {
		text-decoration: none;
	}

	.body h2:not(:first-child) {
		margin-top: var(--vector-space-8);
	}

	.body h3 {
		margin: var(--vector-space-5) 0 var(--vector-space-3);
		font-size: 0.98rem;
		scroll-margin-top: var(--vector-space-8);
	}

	.body p,
	.body li {
		color: var(--text-secondary);
	}

	.body p {
		margin: 0 0 var(--vector-space-4);
	}

	.body ol {
		margin: 0 0 var(--vector-space-4);
		padding-left: 1.2rem;
	}

	.body li {
		margin: 0 0 var(--vector-space-2);
	}

	.body a {
		overflow-wrap: anywhere;
	}

	.related {
		margin: 0;
		padding-top: var(--vector-space-4);
		border-top: 1px solid var(--vector-border);
	}

	@media (max-width: 860px) {
		.toc ol {
			columns: 1;
		}
	}
</style>
