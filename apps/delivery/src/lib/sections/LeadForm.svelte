<script lang="ts">
	import type { PageSection } from '@vector/funnel-engine';

	let {
		section,
		form
	}: {
		section: Extract<PageSection, { type: 'lead-form' }>;
		form?: { accepted?: boolean; error?: string } | null;
	} = $props();

	const labels = {
		name: 'Name',
		email: 'Email',
		phone: 'Phone',
		company: 'Company',
		message: 'Message'
	} as const;
</script>

<section class="lead" id="lead">
	<h2>{section.heading}</h2>
	{#if section.body}
		<p class="section-body">{section.body}</p>
	{/if}
	{#if form?.error}
		<p class="err" role="alert">{form.error}</p>
	{/if}
	{#if form?.accepted}
		<p class="status" role="status">
			Preview request received. Production email is disabled on this host.
		</p>
	{:else}
		<form method="post" action="?/lead">
			{#each section.fields as field (field)}
				<label>
					{labels[field]}
					{#if field === 'message'}
						<textarea name={field} required></textarea>
					{:else if field === 'email'}
						<input name={field} type="email" autocomplete="email" required />
					{:else if field === 'phone'}
						<input name={field} type="tel" autocomplete="tel" />
					{:else if field === 'company'}
						<input name={field} type="text" autocomplete="organization" />
					{:else}
						<input name={field} type="text" autocomplete="name" required />
					{/if}
				</label>
			{/each}
			<button type="submit">{section.submitLabel}</button>
		</form>
	{/if}
</section>
