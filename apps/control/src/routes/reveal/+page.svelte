<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	let device = $state<'desktop' | 'phone'>('desktop');
	const canDecide = $derived(
		data.permissions.includes('pages.manage') || data.permissions.includes('ai.manage')
	);
	const reveal = $derived(data.reveal);
</script>

<PageHeader
	eyebrow="Preview"
	title="Your site"
	description="One direction is ready to review. Approving does not publish the site."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}
{#if form?.notice}
	<Alert tone="info">{form.notice}</Alert>
{/if}

{#if data.needsClient}
	<section>
		<EmptyState title="Select a business on Overview first." />
	</section>
{:else if !reveal?.ready}
	<section>
		<EmptyState
			title="Your site is not ready to review yet."
			detail="Vector will show one direction here after the preview check passes."
		/>
	</section>
{:else}
	<section>
		<p>
			Direction:
			<StatusChip label={reveal.directionName} tone="success" />
		</p>
		<p>{reveal.rationale}</p>
		<p>{reveal.summary}</p>
		{#if reveal.status === 'approved'}
			<p>You approved this direction. It is not live until it is published.</p>
		{:else if reveal.status === 'changes_requested'}
			<p>Change request: {reveal.revisionNote}</p>
		{/if}
		<div class="actions">
			<button type="button" onclick={() => (device = 'desktop')}>Desktop</button>
			<button type="button" onclick={() => (device = 'phone')}>Phone</button>
		</div>
		<div class={device === 'phone' ? 'reveal-frame phone' : 'reveal-frame'}>
			{#if reveal.previewUrl}
				<iframe title="Site preview" src={reveal.previewUrl}></iframe>
			{:else}
				<p>The private preview link appears after the preview is published.</p>
			{/if}
		</div>
		{#if canDecide && reveal.status === 'pending'}
			<form method="post" action="?/approve">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Approve</button>
			</form>
			<form method="post" action="?/changes">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					What should change
					<textarea name="note" required minlength="8" maxlength="400"></textarea>
				</label>
				<button type="submit">Request changes</button>
			</form>
		{/if}
	</section>
{/if}

<style>
	.reveal-frame {
		max-width: 64rem;
		border: 1px solid var(--vector-border, #333);
	}
	.reveal-frame.phone {
		max-width: 24rem;
	}
	iframe {
		width: 100%;
		height: 32rem;
		border: 0;
		background: #111;
	}
</style>
