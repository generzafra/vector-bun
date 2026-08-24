<script lang="ts">
	import StatusChip from './StatusChip.svelte';

	let {
		finding,
		evidence,
		proposedAction,
		expectedImpact,
		confidence,
		risk,
		cost,
		approvalRequired,
		status,
		children
	}: {
		finding: string;
		evidence: string;
		proposedAction: string;
		expectedImpact: string;
		confidence: number;
		risk: string;
		cost?: string;
		approvalRequired: boolean;
		status: string;
		children?: import('svelte').Snippet;
	} = $props();

	const tone = $derived(
		status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning'
	);
</script>

<article class="card">
	<header>
		<p class="eyebrow">Recommendation</p>
		<StatusChip label={status} {tone} />
	</header>
	<dl>
		<div>
			<dt>What Vector detected</dt>
			<dd>{finding}</dd>
		</div>
		<div>
			<dt>Evidence</dt>
			<dd>{evidence}</dd>
		</div>
		<div>
			<dt>Proposed action</dt>
			<dd>{proposedAction}</dd>
		</div>
		<div>
			<dt>Expected impact</dt>
			<dd>{expectedImpact}</dd>
		</div>
		<div class="meta">
			<div>
				<dt>Confidence</dt>
				<dd>{confidence} — explanatory only</dd>
			</div>
			<div>
				<dt>Risk</dt>
				<dd>{risk}</dd>
			</div>
			{#if cost}
				<div>
					<dt>Cost</dt>
					<dd>{cost}</dd>
				</div>
			{/if}
			<div>
				<dt>Human approval</dt>
				<dd>{approvalRequired ? 'Required. Approval does not execute.' : 'Not required'}</dd>
			</div>
		</div>
	</dl>
	{#if children}
		<div class="actions">
			{@render children()}
		</div>
	{/if}
</article>

<style>
	.card {
		display: grid;
		gap: var(--vector-space-4);
		padding: var(--vector-space-5);
		border: 1px solid var(--vector-border);
		border-radius: var(--vector-radius-md);
		background: var(--vector-surface-raised);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--vector-space-3);
	}

	.eyebrow {
		margin: 0;
		color: var(--text-tertiary);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	dl,
	.meta {
		display: grid;
		gap: var(--vector-space-3);
		margin: 0;
	}

	.meta {
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	}

	dt {
		color: var(--text-tertiary);
		font-size: 11px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	dd {
		margin: 0.2rem 0 0;
		color: var(--vector-text-primary);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--vector-space-3);
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>
