<script lang="ts">
	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('pages.manage'));
	const document = $derived(
		data.funnel?.draft?.document ?? data.funnel?.published?.document ?? null
	);
</script>

<h1>Funnel</h1>
<p>
	Compose one lead funnel from the active client's knowledge, then publish an immutable preview
	version. Publication is not a Vector code deploy.
</p>

{#if form?.error}
	<p class="err">{form.error}</p>
{/if}

{#if data.needsClient}
	<p>Select a client on Overview first.</p>
{:else if !data.funnel}
	<p class="err">Funnel could not be loaded.</p>
{:else}
	<section>
		<h2>Status</h2>
		<p>Draft version: {data.funnel.draft?.version ?? 'none'}</p>
		<p>Published version: {data.funnel.published?.version ?? 'none'}</p>
		<p>Preview host: {data.funnel.previewHostname ?? 'not assigned'}</p>
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
	</section>

	{#if canManage}
		<section>
			<h2>Actions</h2>
			<form method="post" action="?/compose">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Compose from knowledge</button>
			</form>
			<form method="post" action="?/publish">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Publish preview</button>
			</form>
		</section>
	{/if}

	<section>
		<h2>Sections</h2>
		{#if !document}
			<p>No funnel document yet. Complete Knowledge, then compose.</p>
		{:else}
			<p>Audience: {document.narrative.audience}</p>
			<p>Primary conversion: {document.narrative.primaryConversion}</p>
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
