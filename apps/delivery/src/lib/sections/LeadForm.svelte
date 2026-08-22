<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { CONSENT_COPY } from '@vector/compliance';
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
	let formStarted = $state(false);

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

	async function emitFormStarted() {
		if (formStarted) return;
		formStarted = true;
		const payload = new FormData();
		payload.set('name', 'form_started');
		payload.set('landingUrl', page.url.href);
		if (document.referrer) payload.set('referrer', document.referrer);
		await fetch('?/event', { method: 'POST', body: payload });
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
			onfocusin={emitFormStarted}
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: false });
					submitting = false;
				};
			}}
		>
			<input type="hidden" name="landingUrl" value={page.url.href} />
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
			<label class="choice">
				<input
					name="consentLeadFollowUp"
					type="checkbox"
					required
					checked={form?.consentLeadFollowUp === true}
				/>
				<span>{CONSENT_COPY.lead_follow_up}</span>
			</label>
			<label class="choice">
				<input name="consentMarketing" type="checkbox" checked={form?.consentMarketing === true} />
				<span>{CONSENT_COPY.marketing}</span>
			</label>
			<button type="submit" disabled={submitting}>
				{submitting ? 'Sending…' : section.submitLabel}
			</button>
		</form>
	{/if}
</section>
