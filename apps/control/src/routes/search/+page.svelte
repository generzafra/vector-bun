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

	function queueTone(status: string) {
		if (status === 'blocked') return 'danger' as const;
		if (status === 'due') return 'warning' as const;
		return 'muted' as const;
	}
</script>

<PageHeader
	eyebrow="Discoverability"
	title="Search"
	description="Traditional search, answer readiness, and AI discovery share one tenant backlog. Official Search Console or Bing rows are provider-reported. Manual measurement is the first compliant method. Cadence and monthly GEO budgets cap recurring work. A mention in an AI answer is not a visit or a lead. Vector does not assign an AI rank or GEO score."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}
{#if form?.notice}
	<Alert tone="info">{form.notice}</Alert>
{/if}

{#if data.portfolio.length > 0}
	<section>
		<h2>Portfolio exceptions</h2>
		<p>
			Clients you can access that have due or blocked search work. This is not an AI rank or GEO
			score. Alpha work never includes another client's queries or tokens.
		</p>
		<table>
			<thead>
				<tr>
					<th>Client</th>
					<th>Due</th>
					<th>Budget left</th>
					<th>Items</th>
				</tr>
			</thead>
			<tbody>
				{#each data.portfolio as row (row.clientId)}
					<tr>
						<td>{row.clientName}{row.paused ? ' · paused' : ''}</td>
						<td>{row.dueCount}</td>
						<td>{row.remainingMinor} {row.currency}</td>
						<td>
							{#each row.items as item (item.kind)}
								<StatusChip label={item.title} tone={queueTone(item.status)} />
							{/each}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
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
		<h2>Cadence and budget</h2>
		<p>
			Weekly technical audit, official sync, answer refresh, and snapshot by default. High-priority
			AI-discovery queries stay manual. Monthly GEO cost is integer minor units. Live generative
			APIs stay unsupported.
		</p>
		<p>
			<StatusChip
				label={overview.cadence.settings.paused ? 'paused' : 'active'}
				tone={overview.cadence.settings.paused ? 'danger' : 'success'}
			/>
			{overview.cadence.spentMinor} spent / {overview.cadence.settings.monthlyBudgetMinor}
			{overview.cadence.settings.currency} this month · {overview.cadence.remainingMinor} remaining
		</p>
		{#if overview.cadence.queue.length === 0}
			<EmptyState title="No cadence queue yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Work</th>
						<th>Status</th>
						<th>Detail</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.cadence.queue as item (item.kind)}
						<tr>
							<td>{item.title}</td>
							<td>
								<StatusChip label={item.status} tone={queueTone(item.status)} />
							</td>
							<td>{item.detail}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form method="post" action="?/cadence" class="wide">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Technical audit days
					<input
						name="technicalAuditIntervalDays"
						type="number"
						min="1"
						max="90"
						value={overview.cadence.settings.technicalAuditIntervalDays}
					/>
				</label>
				<label>
					Official sync days
					<input
						name="propertySyncIntervalDays"
						type="number"
						min="1"
						max="90"
						value={overview.cadence.settings.propertySyncIntervalDays}
					/>
				</label>
				<label>
					Answer-readiness days
					<input
						name="aeoRefreshIntervalDays"
						type="number"
						min="1"
						max="90"
						value={overview.cadence.settings.aeoRefreshIntervalDays}
					/>
				</label>
				<label>
					Snapshot days
					<input
						name="geoSnapshotIntervalDays"
						type="number"
						min="1"
						max="90"
						value={overview.cadence.settings.geoSnapshotIntervalDays}
					/>
				</label>
				<label>
					Manual measurement days
					<input
						name="geoMeasureIntervalDays"
						type="number"
						min="1"
						max="90"
						value={overview.cadence.settings.geoMeasureIntervalDays}
					/>
				</label>
				<label>
					GEO query cap
					<input
						name="geoQueryLimit"
						type="number"
						min="1"
						max="20"
						value={overview.cadence.settings.geoQueryLimit}
					/>
				</label>
				<label>
					Engine cap
					<input
						name="geoEngineLimit"
						type="number"
						min="1"
						max="5"
						value={overview.cadence.settings.geoEngineLimit}
					/>
				</label>
				<label>
					Locale cap
					<input
						name="geoLocaleLimit"
						type="number"
						min="1"
						max="8"
						value={overview.cadence.settings.geoLocaleLimit}
					/>
				</label>
				<label>
					Monthly GEO budget (minor units)
					<input
						name="monthlyBudgetMinor"
						type="number"
						min="0"
						value={overview.cadence.settings.monthlyBudgetMinor}
					/>
				</label>
				<label>
					Currency
					<input name="currency" maxlength="3" value={overview.cadence.settings.currency} />
				</label>
				<label>
					<input type="checkbox" name="paused" checked={overview.cadence.settings.paused} />
					Pause scheduled search work and GEO recording
				</label>
				<button type="submit">Save cadence</button>
			</form>
			<form method="post" action="?/dueSweep">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Run due automated work</button>
			</form>
		{/if}
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
		<h2>Business impact</h2>
		<p>{overview.geoImpact.headline}</p>
		<p>
			<StatusChip label={`visibility ${overview.geoImpact.visibilityLabel}`} tone="muted" />
			<StatusChip label={`referral ${overview.geoImpact.referralLabel}`} tone="muted" />
			<StatusChip label={`lead ${overview.geoImpact.leadLabel}`} tone="muted" />
			<StatusChip label={`outcome ${overview.geoImpact.outcomeLabel}`} tone="muted" />
			<StatusChip label="revenue unknown" tone="muted" />
		</p>
		<p>
			{overview.geoImpact.leadCount} referred leads · {overview.geoImpact.qualifiedCount} qualified ·
			{overview.geoImpact.wonCount} won
		</p>
		{#if overview.geoImpact.leads.length === 0}
			<EmptyState title="No observable search or AI-discovery referred leads yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Channel</th>
						<th>Surface</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.geoImpact.leads as row (row.id)}
						<tr>
							<td>{row.channel}</td>
							<td>{row.engine}</td>
							<td>{row.status}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>AI discovery report</h2>
		<p>
			{overview.geoReport.headline}
		</p>
		<p>
			<StatusChip
				label={overview.geoReport.freshnessLabel}
				tone={overview.geoReport.stale
					? 'warning'
					: overview.geoReport.current
						? 'success'
						: 'muted'}
			/>
			{overview.geoReport.freshnessDetail}
		</p>
		<p>
			{overview.geoReport.mentionedQueries} mentioned of {overview.geoReport.monitoredQueries} monitored
			· {overview.geoReport.observationCount} observations · {overview.geoReport.accurateNo} inaccurate
		</p>
		{#if canManage}
			<form method="post" action="?/geoSnapshot">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Refresh visibility snapshot</button>
			</form>
		{/if}
		{#if overview.geoReport.representations.length === 0}
			<EmptyState title="No fact-accuracy rows in the current snapshot." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Status</th>
						<th>Evidence</th>
						<th>Note</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.geoReport.representations as row (row.id)}
						<tr>
							<td>{row.status}</td>
							<td>{row.evidenceClass}</td>
							<td>{row.detail ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section>
		<h2>AI discovery queries</h2>
		<p>
			This is a small commercial query set from approved knowledge. Manual and operator-assisted
			measurement is the first compliant method. A recorded observation is not a ranking, GEO score,
			visit, or lead. Official generative-engine APIs stay unsupported.
		</p>
		<p>
			{overview.geoReadiness.queries} queries · {overview.geoReadiness.observations} recorded ·
			{overview.geoReadiness.staleObservations} stale
		</p>
		<p>{overview.generativeMeasurement.detail}</p>
		{#if canManage}
			<form method="post" action="?/geoQuerySet">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Refresh commercial query set</button>
			</form>
		{/if}
		{#if overview.geoQueries.length === 0}
			<EmptyState title="No commercial AI-discovery queries yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Query</th>
						<th>Group</th>
						<th>Source</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.geoQueries as query (query.id)}
						<tr>
							<td>{query.query}</td>
							<td>{query.group}</td>
							<td>{query.sourceKind}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if overview.geoObservations.length === 0}
			<EmptyState title="No recorded observations yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>When</th>
						<th>Engine</th>
						<th>Mention</th>
						<th>Citation</th>
						<th>Freshness</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.geoObservations as row (row.id)}
						<tr>
							<td>{row.observedAt}</td>
							<td>{row.engine}</td>
							<td>{row.mentioned ? 'mentioned' : 'not mentioned'}</td>
							<td>
								{row.ownedCitation || row.earnedCitation
									? row.ownedCitation
										? 'owned'
										: 'earned'
									: row.mentionOnly
										? 'mention only'
										: 'none'}
							</td>
							<td>
								<StatusChip label={row.freshnessLabel} tone={row.stale ? 'warning' : 'muted'} />
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage && overview.geoQueries.length > 0}
			<form method="post" action="?/geoObservation" class="wide">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Query
					<select name="queryId">
						{#each overview.geoQueries as query (query.id)}
							<option value={query.id}>{query.query}</option>
						{/each}
					</select>
				</label>
				<label>
					Surface
					<select name="engine">
						<option value="other">Other / unspecified</option>
						<option value="chatgpt">ChatGPT</option>
						<option value="google_ai_overview">Google AI Overview</option>
						<option value="gemini">Gemini</option>
						<option value="perplexity">Perplexity</option>
					</select>
				</label>
				<label>
					Method
					<select name="method">
						<option value="manual">Manual</option>
						<option value="operator_assisted">Operator-assisted</option>
					</select>
				</label>
				<label><input type="checkbox" name="mentioned" /> Mentioned</label>
				<label><input type="checkbox" name="ownedCitation" /> Owned citation</label>
				<label><input type="checkbox" name="earnedCitation" /> Earned citation</label>
				<label><input type="checkbox" name="represented" /> Fact represented</label>
				<label>
					Accurate to approved facts
					<select name="accurate">
						<option value="unknown">Unknown</option>
						<option value="yes">Yes</option>
						<option value="no">No</option>
					</select>
				</label>
				<label>
					Owned source URL
					<input name="ownedUrl" type="url" placeholder="https://www.client.example/" />
				</label>
				<label>
					Earned source URL
					<input name="earnedUrl" type="url" placeholder="https://example.org/article" />
				</label>
				<label>
					Note
					<textarea
						name="detail"
						maxlength="400"
						placeholder="Structured note only. Do not paste a full model answer."></textarea>
				</label>
				<button type="submit">Record observation</button>
			</form>
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
