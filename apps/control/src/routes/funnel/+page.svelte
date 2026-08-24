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
	const gate = $derived(data.funnel?.firstReveal ?? null);
	const gateTone = $derived(
		!gate ? 'muted' : gate.effectivePass ? (gate.passed ? 'success' : 'warning') : 'danger'
	);
	const gateLabel = $derived(
		!gate ? 'not run' : gate.passed ? 'passed' : gate.overrideReason ? 'overridden' : 'failed'
	);
	const sufficiency = $derived(data.funnel?.assetSufficiency ?? null);
	const sufficiencyTone = $derived(
		!sufficiency
			? 'muted'
			: !sufficiency.profileConfirmed
				? 'warning'
				: sufficiency.mediaStrategy === 'authentic'
					? 'success'
					: sufficiency.mediaStrategy === 'hybrid'
						? 'info'
						: 'muted'
	);
	const directions = $derived(data.funnel?.visualDirections ?? null);
	const shareCards = $derived(data.funnel?.shareCards ?? []);
	const shareCardPlacement = $derived(data.funnel?.shareCardPlacement ?? null);
</script>

<PageHeader
	eyebrow="Delivery"
	title="Funnel"
	description="Compose one lead funnel from the active client's knowledge, then publish an immutable preview version. Intelligence drafts are reviewed here. Publication is a Funnel action, not an Intelligence approval."
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
		{#if data.funnel.intelligenceDraft}
			<Alert tone="info">
				Latest draft is from Intelligence ({data.funnel.intelligenceDraft.agentKey}), version
				{data.funnel.intelligenceDraft.version}. Preview stays noindex. Publish preview is a Funnel
				action.
				<a href="/intelligence">Open Intelligence</a>
			</Alert>
		{/if}
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
			<p>
				First Reveal Gate:
				<StatusChip label={gateLabel} tone={gateTone} />
			</p>
			{#if gate?.overrideReason}
				<p>Override reason: {gate.overrideReason}</p>
			{/if}
			{#if sufficiency}
				<p>
					Media readiness:
					<StatusChip label={sufficiency.label} tone={sufficiencyTone} />
				</p>
			{/if}
			{#if directions?.selectedName}
				<p>
					Kept direction:
					<StatusChip label={directions.selectedName} tone="success" />
				</p>
			{/if}
		</div>
	</section>

	{#if sufficiency}
		<section>
			<h2>Media readiness</h2>
			<p>{sufficiency.summary}</p>
			{#if !sufficiency.profileConfirmed}
				<p>
					<a href="/brand">Confirm brand look</a> before a client reveal. An unconfirmed look is not a
					public reveal.
				</p>
			{/if}
		</section>
	{/if}

	{#if directions}
		<section>
			<h2>Layout directions</h2>
			<p>
				Vector compared a few layout directions and kept one for this preview. This is not a client
				reveal, and it is not three websites.
			</p>
			{#each directions.items as item (item.name)}
				<p>
					<StatusChip
						label={item.selected ? 'Kept' : item.fit}
						tone={item.selected ? 'success' : 'muted'}
					/>
					{item.name}
				</p>
				<p>{item.rationale}</p>
			{/each}
		</section>
	{/if}

	<section>
		<h2>Share and email cards</h2>
		<p>
			Vector places your logo and approved copy on Open Graph, social, and email cards. These cards
			are drafts and will not go live until you use them on the preview and publish.
		</p>
		{#if shareCards.length === 0}
			<EmptyState title="No share cards yet." detail="Compose cards after Knowledge is saved." />
		{:else}
			<div class="share-cards">
				{#each shareCards as card (card.id)}
					<figure>
						<img
							src={`/funnel/composition/${card.id}`}
							alt={`${card.label} draft`}
							width={card.width}
							height={card.height}
						/>
						<figcaption>{card.label} · draft{card.hasLogo ? ' · logo included' : ''}</figcaption>
					</figure>
				{/each}
			</div>
			<p>
				Preview status:
				<StatusChip
					label={shareCardPlacement?.live
						? 'on the published preview'
						: shareCardPlacement?.placed
							? 'ready — publish to show'
							: 'not on the preview yet'}
					tone={shareCardPlacement?.live
						? 'success'
						: shareCardPlacement?.placed
							? 'info'
							: 'muted'}
				/>
			</p>
		{/if}
		{#if canManage}
			<form method="post" action="?/composeCards">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Compose share and email cards</button>
			</form>
			{#if shareCards.length > 0}
				<form method="post" action="?/placeCards">
					<input type="hidden" name="_csrf" value={data.csrf} />
					<button type="submit">Use these cards on the preview</button>
				</form>
			{/if}
		{/if}
	</section>

	{#if gate}
		<section>
			<h2>First Reveal Gate</h2>
			<p>
				This is a pre-client check. Preview publish is still allowed. The client should not see a
				failed compose unless an operator records a written override.
			</p>
			<table>
				<thead>
					<tr>
						<th>Check</th>
						<th>Result</th>
						<th>Detail</th>
					</tr>
				</thead>
				<tbody>
					{#each gate.checks as item (item.key)}
						<tr>
							<td>{item.key.replaceAll('_', ' ')}</td>
							<td>
								<StatusChip
									label={item.passed ? 'pass' : 'fail'}
									tone={item.passed ? 'success' : 'danger'}
								/>
							</td>
							<td>{item.detail}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if canManage && !gate.passed && !gate.overrideReason}
				<form method="post" action="?/overrideGate">
					<input type="hidden" name="_csrf" value={data.csrf} />
					<label>
						Override reason
						<textarea name="reason" required minlength="12" maxlength="400"></textarea>
					</label>
					<button type="submit">Record override</button>
				</form>
			{/if}
		</section>
	{/if}

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
