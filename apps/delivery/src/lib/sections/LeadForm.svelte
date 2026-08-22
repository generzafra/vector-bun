<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageSection } from '@vector/funnel-engine';
	import type { LeadFormState } from '$lib/lead-form';

	let {
		section,
		form,
		domainKind = 'preview'
	}: {
		section: Extract<PageSection, { type: 'lead-form' }>;
		form?: LeadFormState;
		domainKind?: 'preview' | 'production' | 'redirect';
	} = $props();
	const previewHost = $derived(domainKind === 'preview');
	const body = $derived(previewHost ? section.body : undefined);
	let submitting = $state(false);

	const labels = {
		name: 'Name',
		email: 'Email',
		phone: 'Phone',
		company: 'Company',
		message: 'Message'
	} as const;

	function fieldValue(field: keyof typeof labels) {
		return form?.[field] ?? '';
	}
</script>

<section class="lead" id="lead">
	<h2>{section.heading}</h2>
	{#if body}
		<p class="section-body">{body}</p>
	{/if}
	{#if form?.error}
		<p class="err" role="alert">{form.error}</p>
	{/if}
	{#if form?.accepted}
		<p class="status" role="status">
			{previewHost
				? 'Preview request received. Production email is disabled on this host.'
				: 'Request received. A teammate will follow up.'}
		</p>
	{:else}
		<form
			method="post"
			action="?/lead"
			aria-busy={submitting}
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: false });
					submitting = false;
				};
			}}
		>
			{#each section.fields as field (field)}
				<label>
					{labels[field]}
					{#if field === 'message'}
						<textarea name={field} required value={fieldValue(field)}></textarea>
					{:else if field === 'email'}
						<input
							name={field}
							type="email"
							autocomplete="email"
							required
							value={fieldValue(field)}
						/>
					{:else if field === 'phone'}
						<input name={field} type="tel" autocomplete="tel" value={fieldValue(field)} />
					{:else if field === 'company'}
						<input name={field} type="text" autocomplete="organization" value={fieldValue(field)} />
					{:else}
						<input
							name={field}
							type="text"
							autocomplete="name"
							required
							value={fieldValue(field)}
						/>
					{/if}
				</label>
			{/each}
			<button type="submit" disabled={submitting}>
				{submitting ? 'Sending…' : section.submitLabel}
			</button>
		</form>
	{/if}
</section>
