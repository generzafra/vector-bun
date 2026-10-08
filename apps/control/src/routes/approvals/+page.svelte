<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('ai.manage'));
	const center = $derived(data.center);
</script>

<PageHeader
	title="Approvals"
	description="Items that need your decision, grouped into campaigns, content, site direction, and connections. Approving does not publish or send."
/>

<p><a href="/reveal">Review your site</a></p>

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
{:else if !center}
	<section>
		<EmptyState
			title="You can view this later."
			detail="An owner or marketer needs to review approvals."
		/>
	</section>
{:else if center.assignedToOther}
	<section>
		<EmptyState
			title="Approvals for this business are assigned to someone else."
			detail="When they are assigned to you, they will show here."
		/>
	</section>
{:else if center.pendingCount === 0}
	<section>
		<EmptyState
			title="Nothing needs you right now."
			detail="When a campaign, content change, or connection is ready, it will show here. Approving does not publish or send."
		/>
	</section>
{:else}
	{#each center.groups as group (group.key)}
		{#if group.items.length > 0}
			<section>
				<h2>{group.label}</h2>
				{#if canManage && group.items.length > 1}
					<form method="post" action="?/decideGroup">
						<input type="hidden" name="_csrf" value={data.csrf} />
						<input type="hidden" name="group" value={group.key} />
						<input type="hidden" name="decision" value="approved" />
						<button type="submit">Approve all in {group.label.toLowerCase()}</button>
					</form>
				{/if}
				<div class="queue">
					{#each group.items as item (item.id)}
						<article>
							<p>{item.proposedAction}</p>
							<p class="detail">{item.finding}</p>
							<StatusChip label="needs you" tone="warning" />
							{#if canManage}
								<div class="actions">
									<form method="post" action="?/decide">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={item.id} />
										<input type="hidden" name="decision" value="approved" />
										<button type="submit">Approve</button>
									</form>
									<form method="post" action="?/decide">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={item.id} />
										<input type="hidden" name="decision" value="rejected" />
										<button type="submit" class="secondary">Reject</button>
									</form>
								</div>
							{/if}
						</article>
					{/each}
				</div>
			</section>
		{/if}
	{/each}
{/if}

<style>
	.queue,
	article,
	.actions {
		display: grid;
		gap: var(--vector-space-3);
	}

	article {
		padding: var(--vector-space-4);
		border: 1px solid var(--vector-border);
		border-radius: var(--vector-radius-md);
		background: var(--vector-surface-raised);
	}

	article p {
		margin: 0;
	}

	.detail {
		color: var(--text-secondary);
	}

	.actions {
		grid-template-columns: repeat(auto-fit, minmax(7rem, max-content));
	}
</style>
