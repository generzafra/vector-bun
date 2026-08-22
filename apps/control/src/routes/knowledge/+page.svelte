<script lang="ts">
	let { data, form } = $props();
	const canManage = $derived(data.permissions.includes('knowledge.manage'));
</script>

<h1>Knowledge</h1>
<p>
	Capture brand, assets, offer, services, and approved claims for the active client. This profile is
	reused at launch instead of custom engineering.
</p>

{#if form?.error}
	<p class="err">{form.error}</p>
{/if}

{#if data.needsClient}
	<p>Select a client on Overview first.</p>
{:else if !data.knowledge}
	<p class="err">Knowledge could not be loaded.</p>
{:else}
	<section>
		<h2>Brand</h2>
		{#if canManage}
			<form class="wide" method="post" action="?/saveBrand">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Display name
					<input name="displayName" required value={data.knowledge.brand?.displayName ?? ''} />
				</label>
				<label>
					Tagline
					<input name="tagline" value={data.knowledge.brand?.tagline ?? ''} />
				</label>
				<label>
					Audience
					<textarea name="audience">{data.knowledge.brand?.audience ?? ''}</textarea>
				</label>
				<label>
					Offer
					<textarea name="offer">{data.knowledge.brand?.offer ?? ''}</textarea>
				</label>
				<label>
					Primary conversion
					<input name="primaryConversion" value={data.knowledge.brand?.primaryConversion ?? ''} />
				</label>
				<label>
					Secondary conversion
					<input
						name="secondaryConversion"
						value={data.knowledge.brand?.secondaryConversion ?? ''}
					/>
				</label>
				<label>
					Personality
					<select name="brandPersonality">
						<option value="">Select</option>
						{#each ['premium', 'technology', 'growth', 'creative', 'corporate'] as personality (personality)}
							<option
								value={personality}
								selected={data.knowledge.brand?.brandPersonality === personality}
							>
								{personality}
							</option>
						{/each}
					</select>
				</label>
				<label>
					Accent
					<input name="accent" value={data.knowledge.brand?.tokens?.accent ?? ''} />
				</label>
				<label>
					Background
					<input name="background" value={data.knowledge.brand?.tokens?.background ?? ''} />
				</label>
				<label>
					Font
					<input name="fontFamily" value={data.knowledge.brand?.tokens?.fontFamily ?? ''} />
				</label>
				<button type="submit">Save brand</button>
			</form>
		{:else if data.knowledge.brand}
			<p>{data.knowledge.brand.displayName}</p>
			<p>{data.knowledge.brand.offer}</p>
		{:else}
			<p>No brand profile yet.</p>
		{/if}
	</section>

	<section>
		<h2>Brand assets</h2>
		<p>
			PNG, JPEG, WEBP, or ICO up to 2MB. Files are tenant-scoped and served through Vector, not raw
			object keys.
		</p>
		{#if data.knowledge.assets.length === 0}
			<p>No brand assets yet. This keeps <code>assets.uploaded</code> pending.</p>
		{:else}
			<ul class="assets">
				{#each data.knowledge.assets as asset (asset.id)}
					<li>
						<img src={`/knowledge/asset/${asset.id}`} alt={asset.originalFilename} />
						<span>{asset.purpose} · {asset.originalFilename}</span>
						{#if canManage}
							<form method="post" action="?/removeAsset">
								<input type="hidden" name="_csrf" value={data.csrf} />
								<input type="hidden" name="id" value={asset.id} />
								<button type="submit">Remove</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		{#if canManage}
			<form class="wide" method="post" action="?/uploadAsset" enctype="multipart/form-data">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Purpose
					<select name="purpose">
						<option value="logo">Logo</option>
						<option value="mark">Mark</option>
						<option value="og">Open Graph</option>
						<option value="favicon">Favicon</option>
						<option value="other">Other</option>
					</select>
				</label>
				<label>
					File
					<input
						name="file"
						type="file"
						accept="image/png,image/jpeg,image/webp,image/x-icon,.ico"
						required
					/>
				</label>
				<button type="submit">Upload asset</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Services</h2>
		{#if data.knowledge.services.length === 0}
			<p>No services yet.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Outcome</th>
						{#if canManage}<th></th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each data.knowledge.services as service (service.id)}
						<tr>
							<td>{service.name}</td>
							<td>{service.outcome}</td>
							{#if canManage}
								<td>
									<form method="post" action="?/removeService">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={service.id} />
										<button type="submit">Remove</button>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form class="wide" method="post" action="?/addService">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Name
					<input name="name" required />
				</label>
				<label>
					Slug
					<input name="slug" required />
				</label>
				<label>
					Outcome
					<input name="outcome" required />
				</label>
				<label>
					Summary
					<textarea name="summary" required></textarea>
				</label>
				<button type="submit">Add service</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Offers</h2>
		{#if data.knowledge.offers.length === 0}
			<p>No offers yet.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Price (minor)</th>
						{#if canManage}<th></th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each data.knowledge.offers as offer (offer.id)}
						<tr>
							<td>{offer.name}</td>
							<td>{offer.startingPriceMinor ?? '—'} {offer.currency}</td>
							{#if canManage}
								<td>
									<form method="post" action="?/removeOffer">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={offer.id} />
										<button type="submit">Remove</button>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form class="wide" method="post" action="?/addOffer">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Name
					<input name="name" required />
				</label>
				<label>
					Summary
					<textarea name="summary" required></textarea>
				</label>
				<label>
					Starting price (minor units)
					<input name="startingPriceMinor" type="number" min="0" />
				</label>
				<label>
					Currency
					<input name="currency" value="USD" maxlength="3" />
				</label>
				<button type="submit">Add offer</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Claims</h2>
		{#if data.knowledge.claims.length === 0}
			<p>No claims yet.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Kind</th>
						<th>Statement</th>
						{#if canManage}<th></th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each data.knowledge.claims as claim (claim.id)}
						<tr>
							<td>{claim.kind}</td>
							<td>{claim.statement}</td>
							{#if canManage}
								<td>
									<form method="post" action="?/removeClaim">
										<input type="hidden" name="_csrf" value={data.csrf} />
										<input type="hidden" name="id" value={claim.id} />
										<button type="submit">Remove</button>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if canManage}
			<form class="wide" method="post" action="?/addClaim">
				<input type="hidden" name="_csrf" value={data.csrf} />
				<label>
					Kind
					<select name="kind">
						<option value="approved">Approved</option>
						<option value="prohibited">Prohibited</option>
					</select>
				</label>
				<label>
					Statement
					<textarea name="statement" required></textarea>
				</label>
				<label>
					Evidence
					<input name="evidence" />
				</label>
				<button type="submit">Add claim</button>
			</form>
		{/if}
	</section>
{/if}
