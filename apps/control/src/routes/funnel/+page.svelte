<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('pages.manage'));
	const document = $derived(
		data.funnel?.draft?.document ?? data.funnel?.published?.document ?? null
	);
</script>

<PageHeader
	eyebrow="Delivery"
	title="Funnel"
	description="Compose one lead funnel from the active client's knowledge, then publish an immutable preview version. Publication is not a Vector code deploy."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}

{#if data.needsClient}
	<section>
		<EmptyState title="Select a client on Overview first." />
	</section>
{:else if !data.funnel}
	<Alert>Funnel could not be loaded.</Alert>
{:else}
	<section>
		<h2>Status</h2>
		<div class="meta">
			<p>Draft version: {data.funnel.draft?.version ?? 'none'}</p>
			<p>Published version: {data.funnel.published?.version ?? 'none'}</p>
			<p>
				Preview host:
				<StatusChip
					label={data.funnel.previewHostname ?? 'not assigned'}
					tone={data.funnel.previewHostname ? 'info' : 'muted'}
				/>
			</p>
			{#if data.funnel.previewUrl && data.funnel.domain?.status === 'active'}
				<p>
					Preview:
					<a href={data.funnel.previewUrl}>{data.funnel.previewUrl}</a>
				</p>
			{:else if data.funnel.previewUrl}
				<p>Preview URL after publish: {data.funnel.previewUrl}</p>
			{/if}
			{#if data.funnel.productionUrl}
				<p>
					Production:
					<a href={data.funnel.productionUrl}>{data.funnel.productionUrl}</a>
				</p>
			{:else}
				<p>Production hostname is activated on Launch.</p>
			{/if}
		</div>
	</section>

	{#if canManage}
		<section>
			<h2>Actions</h2>
			<div class="actions">
				<form method="post" action="?/compose">
					<input type="hidden" name="_csrf" value={data.csrf} />
					<button type="submit">Compose from knowledge</button>
				</form>
				<form method="post" action="?/publish">
					<input type="hidden" name="_csrf" value={data.csrf} />
					<button type="submit">Publish preview</button>
				</form>
			</div>
		</section>
	{/if}

	<section>
		<h2>Sections</h2>
		{#if !document}
			<EmptyState title="No funnel document yet." detail="Complete Knowledge, then compose." />
		{:else}
			<div class="meta">
				<p>Audience: {document.narrative.audience}</p>
				<p>Primary conversion: {document.narrative.primaryConversion}</p>
			</div>
			<table>
				<thead>
					<tr>
						<th>Type</th>
						<th>Id</th>
					</tr>
				</thead>
				<tbody>
					{#each document.sections as section (section.id)}
						<tr>
							<td>{section.type}</td>
							<td>{section.id}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
{/if}
