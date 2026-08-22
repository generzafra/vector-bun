<script lang="ts">
	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('launch.manage'));
	const clocks = $derived(
		data.launch
			? [
					['Signed', data.launch.launch.signedAt],
					['Onboarding started', data.launch.launch.onboardingStartedAt],
					['Vector Ready', data.launch.launch.vectorReadyAt],
					['Generation started', data.launch.launch.generationStartedAt],
					['QA started', data.launch.launch.qaStartedAt],
					['Approval requested', data.launch.launch.approvalRequestedAt],
					['Approval received', data.launch.launch.approvalReceivedAt],
					['Domain ready', data.launch.launch.domainReadyAt],
					['Launch started', data.launch.launch.launchStartedAt],
					['Live', data.launch.launch.liveAt],
					['Paused', data.launch.launch.pausedAt]
				]
			: []
	);
	const openBlocks = $derived(data.launch?.blocks.filter((block) => !block.resolvedAt) ?? []);
</script>

<h1>Launch</h1>
<p>
	Track readiness and launch state for the active client. The same checklist and states apply to
	every client. Clock fields are recorded. A 24-hour SLA is not measured in this slice.
</p>

{#if form?.error}
	<p class="err">{form.error}</p>
{/if}

{#if data.needsClient}
	<p>Select a client on Overview first.</p>
{:else if !data.launch}
	<p class="err">Launch could not be loaded.</p>
{:else}
	<section>
		<h2>Readiness</h2>
		<p>Score: {data.launch.readiness.scorePercent}%</p>
		<p>
			Blocking: {data.launch.readiness.blockingComplete} / {data.launch.readiness.blockingTotal}
		</p>
		<p>
			Optional: {data.launch.readiness.optionalComplete} / {data.launch.readiness.optionalTotal}
		</p>
		<p>Vector Ready: {data.launch.readiness.vectorReady ? 'yes' : 'no'}</p>
		{#if canManage}
			<form method="post" action="?/recalculate">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Recalculate</button>
			</form>
		{/if}
		<table>
			<thead>
				<tr>
					<th>Item</th>
					<th>Kind</th>
					<th>Status</th>
					<th>Detail</th>
					{#if canManage}<th></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.launch.items as item (item.id)}
					<tr>
						<td>{item.label}</td>
						<td>{item.blocking ? 'blocking' : 'optional'}</td>
						<td>{item.status}</td>
						<td>{item.detail ?? ''}</td>
						{#if canManage}
							<td>
								{#if item.source === 'operator' && item.status !== 'complete'}
									<form method="post" action="?/completeItem">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="key" value={item.key} />
										<button type="submit">Record</button>
									</form>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section>
		<h2>State</h2>
		<p>Status: {data.launch.launch.status}</p>
		<p>Class: {data.launch.launch.launchClass}</p>
		<p>Paused seconds: {data.launch.launch.pausedSeconds}</p>
		{#if data.launch.launch.failureReason}
			<p class="err">{data.launch.launch.failureReason}</p>
		{/if}
		{#each clocks as [label, value] (label)}
			<p>{label}: {value ?? '—'}</p>
		{/each}
		{#if canManage}
			<form class="wide" method="post" action="?/transition">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Next state
					<select name="to">
						{#each data.launch.nextStates as state (state)}
							<option value={state}>{state}</option>
						{/each}
					</select>
				</label>
				<label>
					Class
					<select name="launchClass">
						{#each ['A', 'B', 'C', 'D'] as launchClass (launchClass)}
							<option value={launchClass} selected={launchClass === data.launch.launch.launchClass}>
								{launchClass}
							</option>
						{/each}
					</select>
				</label>
				<label>
					Reason
					<textarea name="reason" required></textarea>
				</label>
				<button type="submit">Change state</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Open blocks</h2>
		{#if openBlocks.length === 0}
			<p>No open blocks.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Item</th>
						<th>Message</th>
					</tr>
				</thead>
				<tbody>
					{#each openBlocks as block (block.id)}
						<tr>
							<td>{block.itemKey}</td>
							<td>{block.message}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Events</h2>
		{#if data.launch.events.length === 0}
			<p>No transitions yet.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>From</th>
						<th>To</th>
						<th>Reason</th>
					</tr>
				</thead>
				<tbody>
					{#each data.launch.events as event (event.id)}
						<tr>
							<td>{event.fromStatus}</td>
							<td>{event.toStatus}</td>
							<td>{event.reason}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
{/if}
