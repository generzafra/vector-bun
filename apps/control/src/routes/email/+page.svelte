<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('email.manage'));
	const overview = $derived(data.overview);

	function domainTone(status: string) {
		if (status === 'ready') return 'success' as const;
		if (status === 'failed') return 'danger' as const;
		return 'warning' as const;
	}

	function percent(value: number | null) {
		return value === null ? '—' : `${value}%`;
	}
</script>

<PageHeader
	eyebrow="Nurture"
	title="Email"
	description="Sending-domain readiness is machine-checked. Preview and test leads never send. Consent and suppression are checked before every step. Engagement is counted from Postgres, not the provider dashboard."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}
{#if form?.notice}
	<Alert tone="info">{form.notice}</Alert>
{/if}

{#if data.needsClient || !overview}
	<section>
		<EmptyState title="Select a client on Overview first." />
	</section>
{:else}
	<section>
		<h2>Readiness</h2>
		<p>
			<StatusChip
				label={overview.readiness.complete ? 'ready' : 'pending'}
				tone={overview.readiness.complete ? 'success' : 'warning'}
			/>
			{overview.readiness.detail}
		</p>
		<p>Provider: {overview.provider.adapter} — {overview.provider.detail}</p>
		<p>
			Contacts synced: {overview.engagement.contacts}. Waiting to enroll: {overview.engagement
				.waiting}.
		</p>
	</section>

	<section>
		<h2>Engagement</h2>
		<p>Production sent → delivered → opened → clicked. Preview stays separate and never sends.</p>
		<table>
			<thead>
				<tr>
					<th>Event</th>
					<th>Production</th>
					<th>From previous</th>
					<th>Preview</th>
				</tr>
			</thead>
			<tbody>
				{#each overview.engagement.production.steps as step, index (step.name)}
					<tr>
						<td>{step.name}</td>
						<td>{step.count}</td>
						<td>{percent(step.rateFromPrevious)}</td>
						<td>{overview.engagement.preview.steps[index]?.count ?? 0}</td>
					</tr>
				{/each}
				<tr>
					<td>bounced</td>
					<td>{overview.engagement.production.bounced}</td>
					<td>—</td>
					<td>{overview.engagement.preview.bounced}</td>
				</tr>
				<tr>
					<td>complained</td>
					<td>{overview.engagement.production.complained}</td>
					<td>—</td>
					<td>{overview.engagement.preview.complained}</td>
				</tr>
			</tbody>
		</table>
		<p>
			Enrollments: {overview.engagement.enrollments.active} active,
			{overview.engagement.enrollments.completed} completed,
			{overview.engagement.enrollments.suppressed} suppressed.
		</p>
		{#if canManage}
			<form method="post" action="?/enrollEligible">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Enroll eligible leads</button>
			</form>
			<form method="post" action="?/processDue">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Process due steps</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Inbound drafts</h2>
		<p>
			Replies are stored as drafts. Vector never auto-replies. Legal, refund, dispute, pricing, and
			complaint classes stay human-reviewed.
		</p>
		{#if overview.inbound.length === 0}
			<EmptyState title="No inbound messages." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>From</th>
						<th>Subject</th>
						<th>Class</th>
						<th>Status</th>
						{#if canManage}<th>Review</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each overview.inbound as inbound (inbound.id)}
						<tr>
							<td>{inbound.fromAddress}</td>
							<td>{inbound.subject}</td>
							<td>
								<StatusChip
									label={inbound.classification}
									tone={inbound.requiresHumanReview ? 'warning' : 'muted'}
								/>
							</td>
							<td>
								<StatusChip
									label={inbound.status}
									tone={inbound.status === 'reviewed' ? 'success' : 'info'}
								/>
							</td>
							{#if canManage}
								<td>
									{#if inbound.status === 'received'}
										<form method="post" action="?/reviewInbound">
											<input type="hidden" name="_csrf" value={data.csrf} />
											<input type="hidden" name="id" value={inbound.id} />
											<button type="submit">Mark reviewed</button>
										</form>
									{:else}
										—
									{/if}
								</td>
							{/if}
						</tr>
						<tr>
							<td colspan={canManage ? 5 : 4}>{inbound.textBody || '(empty body)'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Sending domains</h2>
		{#if overview.domains.length === 0}
			<EmptyState
				title="No sending domain yet."
				detail="SPF, DKIM, DMARC, and an approved From address are required before production nurture."
			/>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Domain</th>
						<th>From</th>
						<th>SPF</th>
						<th>DKIM</th>
						<th>DMARC</th>
						<th>Status</th>
						{#if canManage}<th>Recheck</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each overview.domains as domain (domain.id)}
						<tr>
							<td>{domain.domain}</td>
							<td>{domain.fromAddress}</td>
							<td>{domain.spfReady ? 'pass' : 'fail'}</td>
							<td>{domain.dkimReady ? 'pass' : 'fail'}</td>
							<td>{domain.dmarcReady ? 'pass' : 'fail'}</td>
							<td>
								<StatusChip label={domain.status} tone={domainTone(domain.status)} />
							</td>
							{#if canManage}
								<td>
									<form method="post" action="?/recheck">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={domain.id} />
										<button type="submit">Recheck DNS</button>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form method="post" action="?/domain" class="wide">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Domain
					<input name="domain" required placeholder="mail.client.example" />
				</label>
				<label>
					From address
					<input name="fromAddress" type="email" required placeholder="hello@mail.client.example" />
				</label>
				<label>
					From name
					<input name="fromName" required placeholder="Client name" />
				</label>
				<label>
					DKIM selector
					<input name="dkimSelector" value="resend" />
				</label>
				<label class="choice">
					<input name="fromApproved" type="checkbox" />
					<span>From identity is approved</span>
				</label>
				<button type="submit">Save domain</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Welcome sequence</h2>
		{#if overview.sequences.length === 0}
			<EmptyState title="No approved sequence." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Status</th>
						<th>Version</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.sequences as sequence (sequence.id)}
						<tr>
							<td>{sequence.name}</td>
							<td>
								<StatusChip
									label={sequence.status}
									tone={sequence.status === 'approved' ? 'success' : 'muted'}
								/>
							</td>
							<td>{sequence.version}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Enrollments</h2>
		{#if overview.enrollments.length === 0}
			<EmptyState title="No nurture enrollments yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Email</th>
						<th>Status</th>
						<th>Step</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.enrollments as enrollment (enrollment.id)}
						<tr>
							<td>{enrollment.email}</td>
							<td>
								<StatusChip
									label={enrollment.status}
									tone={enrollment.status === 'completed' ? 'success' : 'info'}
								/>
							</td>
							<td>{enrollment.currentStepIndex}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Messages</h2>
		{#if overview.messages.length === 0}
			<EmptyState title="No messages recorded." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>To</th>
						<th>Subject</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.messages as message (message.id)}
						<tr>
							<td>{message.toAddress}</td>
							<td>{message.subject}</td>
							<td>
								<StatusChip
									label={message.isTest ? `${message.status} · test` : message.status}
									tone={message.status === 'sent' || message.status === 'delivered'
										? 'success'
										: message.status === 'skipped'
											? 'warning'
											: 'muted'}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Suppressions</h2>
		{#if overview.suppressions.length === 0}
			<EmptyState title="No suppressions." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Email</th>
						<th>Scope</th>
						<th>Reason</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.suppressions as row (row.id)}
						<tr>
							<td>{row.email}</td>
							<td>{row.scope}</td>
							<td>{row.reason}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form method="post" action="?/suppress">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Email
					<input name="email" type="email" required />
				</label>
				<label>
					Reason
					<select name="reason">
						<option value="operator">operator</option>
						<option value="unsubscribe">unsubscribe</option>
					</select>
				</label>
				<button type="submit">Suppress</button>
			</form>
		{/if}
	</section>
{/if}
