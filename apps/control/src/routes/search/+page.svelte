<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import RecommendationCard from '$lib/vector/RecommendationCard.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('seo.manage'));
	const overview = $derived(data.overview);

	function propertyTone(status: string) {
		if (status === 'active') return 'success' as const;
		if (status === 'expired' || status === 'revoked') return 'danger' as const;
		return 'warning' as const;
	}

	function severityTone(severity: string) {
		if (severity === 'high') return 'danger' as const;
		if (severity === 'medium') return 'warning' as const;
		return 'muted' as const;
	}
</script>

<PageHeader
	eyebrow="Discoverability"
	title="Search"
	description="Traditional search, answer readiness, and later AI discovery share one tenant backlog. Official Search Console or Bing rows are provider-reported. A mention in an AI answer is not a visit or a lead. Vector does not assign an AI rank or GEO score."
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
				label={overview.readiness.complete ? 'connected' : 'pending'}
				tone={overview.readiness.complete ? 'success' : 'warning'}
			/>
			{overview.readiness.detail}
		</p>
		<p>Adapter: {overview.provider.adapter} — {overview.provider.detail}</p>
		<p>{overview.generativeMeasurement.detail}</p>
	</section>

	<section>
		<h2>Official properties</h2>
		<p>
			Credentials are encrypted and never shown. A missing property does not block a normal launch.
		</p>
		{#if overview.properties.length === 0}
			<EmptyState
				title="No official search property yet."
				detail="Connect Search Console or Bing when the client has approved access."
			/>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Engine</th>
						<th>Site</th>
						<th>Status</th>
						<th>Last sync</th>
						{#if canManage}
							<th>Actions</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each overview.properties as property (property.id)}
						<tr>
							<td>{property.engine}</td>
							<td>{property.siteUrl}</td>
							<td>
								<StatusChip label={property.status} tone={propertyTone(property.status)} />
							</td>
							<td>{property.lastSyncedAt ?? '—'}</td>
							{#if canManage}
								<td>
									<form method="post" action="?/validate">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={property.id} />
										<button type="submit">Check</button>
									</form>
									<form method="post" action="?/sync">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={property.id} />
										<button type="submit">Sync</button>
									</form>
									<form method="post" action="?/sitemap">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={property.id} />
										<input
											name="sitemapUrl"
											required
											placeholder="https://client.example/sitemap.xml"
										/>
										<button type="submit">Submit sitemap</button>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form method="post" action="?/connect" class="wide">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Engine
					<select name="engine">
						<option value="google">Google Search Console</option>
						<option value="bing">Bing Webmaster</option>
					</select>
				</label>
				<label>
					Site URL
					<input name="siteUrl" type="url" required placeholder="https://www.client.example/" />
				</label>
				<label>
					Access token or API key
					<input name="credential" type="password" required autocomplete="off" />
				</label>
				<button type="submit">Connect property</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Technical issues</h2>
		{#if canManage}
			<form method="post" action="?/audit">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Run technical audit</button>
			</form>
		{/if}
		{#if overview.issues.length === 0}
			<EmptyState title="No open technical issues recorded." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Path</th>
						<th>Issue</th>
						<th>Severity</th>
						<th>Evidence</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.issues as issue (issue.id)}
						<tr>
							<td>{issue.path ?? '—'}</td>
							<td>{issue.detail}</td>
							<td>
								<StatusChip label={issue.severity} tone={severityTone(issue.severity)} />
							</td>
							<td>{issue.evidenceClass}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Official queries</h2>
		<p>These rows come from an official search property. They are not a ranking promise.</p>
		{#if overview.queries.length === 0}
			<EmptyState title="No official query rows yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Query</th>
						<th>Page</th>
						<th>Clicks</th>
						<th>Impressions</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.queries as query (query.id)}
						<tr>
							<td>{query.query}</td>
							<td>{query.pageUrl || '—'}</td>
							<td>{query.clicks}</td>
							<td>{query.impressions}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>Answer readiness</h2>
		<p>
			Entities and questions come from approved knowledge. A gap means a published FAQ does not yet
			carry that fact. Vector does not create a page per question.
		</p>
		<p>
			{overview.answerReadiness.mapped} mapped · {overview.answerReadiness.gaps} gap(s) ·
			{overview.answerReadiness.targets} target(s)
		</p>
		{#if canManage}
			<form method="post" action="?/answerReadiness">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Refresh answer readiness</button>
			</form>
		{/if}
		{#if overview.entities.length === 0}
			<EmptyState title="No schema entities recorded yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Entity</th>
						<th>Kind</th>
						<th>Fact</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.entities as entity (entity.id)}
						<tr>
							<td>{entity.name}</td>
							<td>{entity.kind}</td>
							<td>{entity.fact}</td>
							<td>
								<StatusChip
									label={entity.status}
									tone={entity.status === 'current' ? 'success' : 'warning'}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if overview.answerTargets.length === 0}
			<EmptyState title="No answer targets recorded yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Question</th>
						<th>Source</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.answerTargets as target (target.id)}
						<tr>
							<td>{target.question}</td>
							<td>{target.sourceKind}</td>
							<td>
								<StatusChip
									label={target.status}
									tone={target.status === 'mapped' ? 'success' : 'warning'}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if overview.briefs.length > 0}
			<div class="cards">
				{#each overview.briefs as brief (brief.id)}
					<RecommendationCard
						finding={brief.title}
						evidence="content brief · source-backed FAQ"
						proposedAction={brief.proposedAction}
						expectedImpact={brief.problem}
						confidence={1}
						risk="low"
						cost="No new page per question"
						approvalRequired={true}
						status={brief.status}
					/>
				{/each}
			</div>
		{/if}
	</section>

	<section>
		<h2>Backlog</h2>
		<p>
			Publish-ready requires an approved knowledge claim or an official query. Hypothesis items stay
			in the backlog.
		</p>
		{#if overview.opportunities.length === 0}
			<EmptyState title="No SEO, AEO, or GEO opportunities yet." />
		{:else}
			<div class="cards">
				{#each overview.opportunities as item (item.id)}
					<RecommendationCard
						finding={item.title}
						evidence={`${item.channel} · ${item.evidenceClass} · ${item.sourceKind}`}
						proposedAction={item.proposedAction}
						expectedImpact={item.problem}
						confidence={item.priority}
						risk={item.effort}
						cost="No guaranteed ranking or citation"
						approvalRequired={true}
						status={item.status}
					>
						{#if canManage && item.publishReadyAllowed && item.status !== 'publish_ready'}
							<form method="post" action="?/publishReady">
								<input type="hidden" name="_csrf" value={data.csrf} />
								<input type="hidden" name="id" value={item.id} />
								<button type="submit">Mark publish-ready</button>
							</form>
						{/if}
					</RecommendationCard>
				{/each}
			</div>
		{/if}
		{#if canManage}
			<form method="post" action="?/opportunity" class="wide">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Channel
					<select name="channel">
						<option value="seo">Traditional search</option>
						<option value="aeo">Answer readiness</option>
						<option value="geo">AI discovery</option>
					</select>
				</label>
				<label>
					Title
					<input name="title" required maxlength="160" />
				</label>
				<label>
					Problem
					<textarea name="problem" required maxlength="800"></textarea>
				</label>
				<label>
					Proposed action
					<textarea name="proposedAction" required maxlength="800"></textarea>
				</label>
				<label>
					Evidence class
					<select name="evidenceClass">
						<option value="source_verified">source_verified</option>
						<option value="provider_reported">provider_reported</option>
						<option value="observed">observed</option>
						<option value="inferred">inferred</option>
						<option value="hypothesis">hypothesis</option>
					</select>
				</label>
				<label>
					Source
					<select name="sourceKind">
						<option value="knowledge_claim">Approved claim</option>
						<option value="official_query">Official query</option>
					</select>
				</label>
				<label>
					Source id
					<input name="sourceId" required placeholder="Claim or official query id" />
				</label>
				<label>
					Effort
					<select name="effort">
						<option value="low">low</option>
						<option value="medium" selected>medium</option>
						<option value="high">high</option>
					</select>
				</label>
				<button type="submit">Add opportunity</button>
			</form>
			{#if overview.claims.length > 0}
				<p>
					Approved claims: {overview.claims
						.map((claim) => `${claim.statement} (${claim.id})`)
						.join('; ')}
				</p>
			{/if}
		{/if}
	</section>
{/if}

<style>
	section {
		display: grid;
		gap: var(--vector-space-4);
		margin-bottom: var(--vector-space-8);
	}

	h2 {
		margin: 0;
	}

	p {
		margin: 0;
		color: var(--text-secondary);
	}

	.cards {
		display: grid;
		gap: var(--vector-space-4);
	}

	form {
		display: flex;
		flex-wrap: wrap;
		gap: var(--vector-space-3);
		align-items: end;
	}

	form.wide {
		display: grid;
		gap: var(--vector-space-3);
		align-items: stretch;
	}

	label {
		display: grid;
		gap: 0.3rem;
	}
</style>
