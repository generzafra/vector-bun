<script lang="ts">
	import Alert from '$lib/vector/Alert.svelte';
	import EmptyState from '$lib/vector/EmptyState.svelte';
	import PageHeader from '$lib/vector/PageHeader.svelte';
	import StatusChip from '$lib/vector/StatusChip.svelte';

	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('social.manage'));
	const overview = $derived(data.overview);
	const approvedAssets = $derived(
		overview?.creative.filter((asset) => asset.status === 'approved') ?? []
	);
	const scheduledPosts = $derived(
		overview?.posts
			.filter((post) => post.status === 'scheduled')
			.slice()
			.sort((a, b) => {
				const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
				const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
				return aTime - bTime;
			}) ?? []
	);

	function postTone(status: string) {
		if (status === 'published') return 'success' as const;
		if (status === 'failed') return 'danger' as const;
		if (status === 'approved' || status === 'scheduled') return 'info' as const;
		return 'warning' as const;
	}

	function nextStatuses(status: string) {
		if (status === 'idea') return ['draft'];
		if (status === 'draft') return ['reviewed'];
		if (status === 'reviewed') return ['approved'];
		if (status === 'failed') return ['approved'];
		return [];
	}
</script>

<PageHeader
	eyebrow="Growth"
	title="Social"
	description="Connect LinkedIn, X, Facebook, and Instagram through official OAuth. Approved posts and C0 images publish through those APIs. Instagram Graph requires an image. Tokens stay encrypted and refresh on the server. Scheduled posts, metrics, and social-to-lead tracking use the existing attribution path."
/>

{#if form?.error}
	<Alert>{form.error}</Alert>
{/if}
{#if form?.notice}
	<Alert tone="info">{form.notice}</Alert>
{/if}
{#if data.oauthNotice}
	<Alert tone="info">{data.oauthNotice}</Alert>
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
				label={overview.readiness.complete
					? 'ready'
					: overview.readiness.notApplicable
						? 'not required'
						: 'pending'}
				tone={overview.readiness.complete
					? 'success'
					: overview.readiness.notApplicable
						? 'muted'
						: 'warning'}
			/>
			{overview.readiness.detail}
		</p>
		<p>Adapters: {overview.provider.adapter} — {overview.provider.detail}</p>
		<p>Workflows: {overview.workflows.adapter} — {overview.workflows.detail}</p>
	</section>

	<section>
		<h2>Connections</h2>
		<p>
			Required accounts block Vector Ready when social is in the package. Official OAuth stores
			encrypted tokens on the server. Tokens are never shown.
		</p>
		<p>Redirect URI: {overview.oauth.redirectUri}</p>
		{#if overview.accounts.length === 0}
			<EmptyState title="No social accounts connected." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Platform</th>
						<th>Handle</th>
						<th>Required</th>
						<th>Account</th>
						<th>Connection</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each overview.accounts as account (account.id)}
						{@const connection = overview.connections.find(
							(row) => row.id === account.connectionId
						)}
						<tr>
							<td>{account.platform}</td>
							<td>{account.handle}</td>
							<td>{account.required ? 'yes' : 'no'}</td>
							<td>
								<StatusChip
									label={account.status}
									tone={account.status === 'active' ? 'success' : 'warning'}
								/>
							</td>
							<td>
								<StatusChip
									label={connection?.status ?? 'missing'}
									tone={connection?.status === 'active' ? 'success' : 'warning'}
								/>
							</td>
							<td>
								{#if canManage && connection}
									<form method="post" action="?/refreshConnection">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={connection.id} />
										<button type="submit">Refresh token</button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form method="post" action="?/startOAuth">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Platform
					<select name="platform" required>
						<option value="linkedin">LinkedIn</option>
						<option value="x">X</option>
						<option value="facebook">Facebook</option>
						<option value="instagram">Instagram</option>
					</select>
				</label>
				<label>
					<input name="required" type="checkbox" checked />
					Required for Vector Ready
				</label>
				<button type="submit">Connect with official OAuth</button>
			</form>
			<p>
				LinkedIn {overview.oauth.configured.linkedin ? 'ready' : 'needs credentials'} · X
				{overview.oauth.configured.x ? 'ready' : 'needs credentials'} · Facebook
				{overview.oauth.configured.facebook ? 'ready' : 'needs credentials'} · Instagram
				{overview.oauth.configured.instagram ? 'ready' : 'needs credentials'}
			</p>
			<form method="post" action="?/connect">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<p>Advanced: paste a token only when official OAuth cannot run.</p>
				<label>
					Platform
					<select name="platform" required>
						<option value="linkedin">LinkedIn</option>
						<option value="x">X</option>
						<option value="facebook">Facebook</option>
						<option value="instagram">Instagram</option>
					</select>
				</label>
				<label>
					Handle
					<input name="handle" maxlength="80" required />
				</label>
				<label>
					Display name
					<input name="displayName" maxlength="120" required />
				</label>
				<label>
					External account id
					<input name="externalAccountId" maxlength="180" required />
				</label>
				<label>
					Access token
					<input name="accessToken" type="password" autocomplete="off" minlength="8" required />
				</label>
				<label>
					Refresh token
					<input name="refreshToken" type="password" autocomplete="off" />
				</label>
				<label>
					<input name="required" type="checkbox" checked />
					Required for Vector Ready
				</label>
				<button type="submit">Save connection</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Creative library</h2>
		<p>Operator uploads only. Bytes stay on StorageProvider under the tenant creative prefix.</p>
		{#if overview.creative.length === 0}
			<EmptyState title="No creative assets uploaded." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Title</th>
						<th>Status</th>
						<th>Rights</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each overview.creative as asset (asset.id)}
						<tr>
							<td>{asset.title}</td>
							<td><StatusChip label={asset.status} tone={postTone(asset.status)} /></td>
							<td>{asset.rights.status}</td>
							<td>
								{#if canManage && asset.status !== 'approved'}
									<form method="post" action="?/confirmRights">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={asset.id} />
										<select name="rightsStatus" required>
											<option value="client_owned">Client owned</option>
											<option value="client_approved">Client approved</option>
											<option value="restricted">Restricted</option>
											<option value="prohibited">Prohibited</option>
										</select>
										<button type="submit">Confirm rights</button>
									</form>
									<form method="post" action="?/approveAsset">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={asset.id} />
										<button type="submit">Approve</button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form method="post" action="?/uploadAsset" enctype="multipart/form-data">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Title
					<input name="title" maxlength="160" required />
				</label>
				<label>
					Kind
					<select name="kind">
						<option value="image">Image</option>
						<option value="graphic">Graphic</option>
						<option value="other">Other</option>
					</select>
				</label>
				<label>
					File
					<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
				</label>
				<button type="submit">Upload asset</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Scheduled</h2>
		<p>
			Due posts publish through the social-due-sweep workflow. Tokens refresh before publish when
			they are expired or near expiry.
		</p>
		{#if scheduledPosts.length === 0}
			<EmptyState title="No scheduled posts." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>When</th>
						<th>Body</th>
					</tr>
				</thead>
				<tbody>
					{#each scheduledPosts as post (post.id)}
						<tr>
							<td>{post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : '—'}</td>
							<td>{post.body}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form method="post" action="?/processDue">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Process scheduled posts</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Posts</h2>
		<p>
			Lifecycle is idea → draft → reviewed → approved → scheduled or published. Approval is
			required. Attach <code>utm_medium=social</code> and <code>utm_content=post:&lt;id&gt;</code> so
			leads join this post.
		</p>
		{#if overview.posts.length === 0}
			<EmptyState title="No social posts yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Status</th>
						<th>Body</th>
						<th>Asset</th>
						<th>Leads</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each overview.posts as post (post.id)}
						<tr>
							<td><StatusChip label={post.status} tone={postTone(post.status)} /></td>
							<td>{post.body}</td>
							<td>{post.assetId ? 'attached' : 'text only'}</td>
							<td>{post.attributedLeadCount}</td>
							<td>
								{#if canManage}
									{#each nextStatuses(post.status) as next (next)}
										<form method="post" action="?/transition">
											<input type="hidden" name="_csrf" value={data.csrf} />
											<input type="hidden" name="id" value={post.id} />
											<input type="hidden" name="to" value={next} />
											<button type="submit">Mark {next}</button>
										</form>
									{/each}
									{#if post.status === 'approved' && overview.accounts.length > 0}
										<form method="post" action="?/publish">
											<input type="hidden" name="_csrf" value={data.csrf} />
											<input type="hidden" name="id" value={post.id} />
											{#each overview.accounts as account (account.id)}
												<label>
													<input
														name="accountIds"
														type="checkbox"
														value={account.id}
														checked={account.status === 'active'}
													/>
													{account.platform}
												</label>
											{/each}
											<button type="submit">Publish</button>
										</form>
										<form method="post" action="?/schedule">
											<input type="hidden" name="_csrf" value={data.csrf} />
											<input type="hidden" name="id" value={post.id} />
											<label>
												Schedule
												<input name="scheduledAt" type="datetime-local" required />
											</label>
											<button type="submit">Schedule</button>
										</form>
									{/if}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form method="post" action="?/createPost">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Body
					<textarea name="body" maxlength="2000" required></textarea>
				</label>
				<label>
					Approved asset
					<select name="assetId">
						<option value="">Text only</option>
						{#each approvedAssets as asset (asset.id)}
							<option value={asset.id}>{asset.title}</option>
						{/each}
					</select>
				</label>
				<button type="submit">Create draft</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Publications</h2>
		{#if overview.publications.length === 0}
			<EmptyState title="No publications yet." />
		{:else}
			<table>
				<thead>
					<tr>
						<th>Platform</th>
						<th>Status</th>
						<th>Provider id</th>
						<th>Metrics</th>
						<th>Error</th>
					</tr>
				</thead>
				<tbody>
					{#each overview.publications as publication (publication.id)}
						<tr>
							<td>{publication.platform}</td>
							<td>
								<StatusChip
									label={publication.status}
									tone={publication.status === 'published' ? 'success' : 'warning'}
								/>
							</td>
							<td>{publication.providerPostId ?? '—'}</td>
							<td>
								{#if publication.metrics}
									{publication.metrics.impressions} imp / {publication.metrics.likes} likes / {publication
										.metrics.clicks} clicks
								{:else}
									—
								{/if}
							</td>
							<td>{publication.error ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form method="post" action="?/syncMetrics">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<button type="submit">Sync metrics</button>
			</form>
		{/if}
	</section>
{/if}
