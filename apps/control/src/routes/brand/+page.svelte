<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';
	import { DEFAULT_PROHIBITED_STYLES, hasOperatorControlNav } from '@vector/contracts';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('knowledge.manage'));
	const operatorNav = $derived(hasOperatorControlNav(data.permissions));
	const review = $derived(data.review);
	const proposal = $derived(review?.proposal);
	let editing = $state(false);

	function selectedProhibited(style: string) {
		return (
			proposal?.prohibitedStyles.some((item) => item.toLowerCase() === style.toLowerCase()) ?? true
		);
	}

	function extraProhibited() {
		const defaults = new Set(DEFAULT_PROHIBITED_STYLES.map((style) => style.toLowerCase()));
		return (
			proposal?.prohibitedStyles.filter((style) => !defaults.has(style.toLowerCase())).join('\n') ??
			''
		);
	}
</script>

<PageHeader
	eyebrow={operatorNav ? 'Creative' : undefined}
	title="Brand look"
	description="Confirm the logo, colors, and visual style Vector should use. This is not a design questionnaire."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}
{#if form?.confirmed}
	<Alert tone="info">Confirmed. Vector will use this look for your site direction.</Alert>
{/if}
{#if form?.saved}
	<Alert tone="info"
		>Saved. Confirm when this looks right. An unconfirmed look is not a public reveal.</Alert
	>
{/if}

{#if data.needsClient}
	<section>
		<EmptyState title="Select a business on Overview first." />
	</section>
{:else if !review || !proposal}
	<section>
		<EmptyState
			title="You can view this later."
			detail="An owner or operator can confirm the brand look."
		/>
	</section>
{:else}
	<section>
		<div class="meta">
			<StatusChip
				label={review.confirmed ? 'Confirmed' : 'Needs confirm'}
				tone={review.confirmed ? 'success' : 'warning'}
			/>
			{#if operatorNav}
				<p>Drafted from uploaded logo and brand inputs. Public URL extraction is later.</p>
			{/if}
		</div>

		{#if !editing}
			<h2>We found the following brand direction</h2>
			{#if proposal.primaryLogoAssetId}
				<ul class="assets">
					<li>
						<img src={`/knowledge/asset/${proposal.primaryLogoAssetId}`} alt="Primary logo" />
						<span>Primary logo</span>
					</li>
				</ul>
			{:else}
				<p>No logo yet. You can still confirm colors and style.</p>
			{/if}
			{#if proposal.primaryColor}
				<p>
					<span class="swatch" style:background={proposal.primaryColor}></span>
					Primary color: {proposal.primaryColor}
				</p>
			{:else}
				<p>Primary color is not set yet.</p>
			{/if}
			{#if proposal.accentColor}
				<p>
					<span class="swatch" style:background={proposal.accentColor}></span>
					Accent: {proposal.accentColor}
				</p>
			{/if}
			<p>Visual style: {proposal.visualPersonality || 'Not set yet'}</p>
			<p>Photography: {proposal.photographyDirection || 'Not set yet'}</p>
			<p>Avoid: {proposal.prohibitedStyles.join(', ') || 'Not set yet'}</p>
			<p>Is this correct?</p>
			{#if canManage}
				<div class="actions">
					{#if review.readyToConfirm}
						<form method="post" action="?/confirm">
							<input type="hidden" name="_csrf" value={data.csrf} />
							<input
								name="primaryLogoAssetId"
								type="hidden"
								value={proposal.primaryLogoAssetId ?? ''}
							/>
							<input name="primaryColor" type="hidden" value={proposal.primaryColor ?? ''} />
							<input name="accentColor" type="hidden" value={proposal.accentColor ?? ''} />
							<input name="primaryFont" type="hidden" value={proposal.primaryFont ?? ''} />
							<input name="visualPersonality" type="hidden" value={proposal.visualPersonality} />
							<input
								name="photographyDirection"
								type="hidden"
								value={proposal.photographyDirection}
							/>
							{#each proposal.prohibitedStyles as style, index (`${style}-${index}`)}
								<input name="prohibitedStyle" type="hidden" value={style} />
							{/each}
							<button type="submit">Confirm</button>
						</form>
					{:else}
						<p>
							Add a primary color, visual style, photography direction, and at least one style to
							avoid.
						</p>
					{/if}
					<button type="button" class="secondary" onclick={() => (editing = true)}>Edit</button>
				</div>
			{/if}
		{:else if canManage}
			<h2>Edit brand look</h2>
			<form class="wide" method="post" action="?/save">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<input type="hidden" name="source" value="edited" />
				<label>
					Primary logo
					<select name="primaryLogoAssetId">
						<option value="">No logo</option>
						{#each review.logos as logo (logo.id)}
							<option value={logo.id} selected={logo.id === proposal.primaryLogoAssetId}>
								{logo.originalFilename}
							</option>
						{/each}
					</select>
				</label>
				<label>
					Primary color
					<input
						name="primaryColor"
						required
						maxlength="7"
						placeholder="#123456"
						value={proposal.primaryColor ?? ''}
					/>
				</label>
				<label>
					Accent
					<input
						name="accentColor"
						maxlength="7"
						placeholder="#ABCDEF"
						value={proposal.accentColor ?? ''}
					/>
				</label>
				<label>
					Primary font
					<input name="primaryFont" maxlength="80" value={proposal.primaryFont ?? ''} />
				</label>
				<label>
					Visual style
					<input
						name="visualPersonality"
						required
						maxlength="120"
						placeholder="Premium / clean / professional"
						value={proposal.visualPersonality}
					/>
				</label>
				<label>
					Photography
					<input
						name="photographyDirection"
						required
						maxlength="200"
						placeholder="Real people, natural lighting"
						value={proposal.photographyDirection}
					/>
				</label>
				<fieldset>
					<legend>Styles to avoid</legend>
					{#each DEFAULT_PROHIBITED_STYLES as style (style)}
						<label>
							<input
								type="checkbox"
								name="prohibitedStyle"
								value={style}
								checked={selectedProhibited(style)}
							/>
							{style}
						</label>
					{/each}
					<label>
						Anything else to avoid
						<textarea name="prohibitedExtra" maxlength="400" rows="3">{extraProhibited()}</textarea>
					</label>
				</fieldset>
				<div class="actions">
					<button type="submit">Save</button>
					<button type="submit" formaction="?/confirm">Confirm</button>
					<button type="button" class="secondary" onclick={() => (editing = false)}>Cancel</button>
				</div>
			</form>
		{/if}
	</section>
{/if}

<style>
	.swatch {
		display: inline-block;
		width: 1.1rem;
		height: 1.1rem;
		margin-right: 0.35rem;
		vertical-align: middle;
		border: 1px solid var(--vector-border);
		border-radius: var(--vector-radius-sm);
	}

	fieldset {
		display: grid;
		gap: var(--vector-space-2);
		margin: 0;
		padding: var(--vector-space-3);
		border: 1px solid var(--vector-border);
		border-radius: var(--vector-radius-sm);
	}

	legend {
		padding: 0 0.25rem;
	}
</style>
