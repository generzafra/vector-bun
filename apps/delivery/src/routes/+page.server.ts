import { error, fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { captureLead, deliveryTenantContext, recordDeliveryEvent } from '@vector/domain';
import { jsonLdScript, publicJsonLd } from '@vector/funnel-engine';
import { logError } from '@vector/observability';
import {
	ANALYTICS_SESSION_COOKIE,
	VISITOR_COOKIE,
	analyticsCookieOptions,
	cookieId
} from '$lib/visitor';

function fieldValues(form: FormData) {
	return {
		name: String(form.get('name') ?? ''),
		email: String(form.get('email') ?? ''),
		phone: String(form.get('phone') ?? ''),
		company: String(form.get('company') ?? ''),
		message: String(form.get('message') ?? ''),
		consentLeadFollowUp: form.get('consentLeadFollowUp') === 'on',
		consentMarketing: form.get('consentMarketing') === 'on'
	};
}

function attributionFrom(url: URL, request: Request, form?: FormData) {
	return {
		landingUrl: String(form?.get('landingUrl') ?? url.href),
		referrer: String(form?.get('referrer') ?? request.headers.get('referer') ?? ''),
		utmSource: url.searchParams.get('utm_source'),
		utmMedium: url.searchParams.get('utm_medium'),
		utmCampaign: url.searchParams.get('utm_campaign'),
		utmTerm: url.searchParams.get('utm_term'),
		utmContent: url.searchParams.get('utm_content')
	};
}

export async function load({ locals, cookies, url, request }) {
	if (locals.delivery.kind !== 'page') error(404, 'Unknown host');
	const visitorId = cookieId(cookies.get(VISITOR_COOKIE));
	const sessionId = cookieId(cookies.get(ANALYTICS_SESSION_COOKIE));
	cookies.set(VISITOR_COOKIE, visitorId, analyticsCookieOptions());
	cookies.set(ANALYTICS_SESSION_COOKIE, sessionId, analyticsCookieOptions());
	const page = locals.delivery;
	try {
		await recordDeliveryEvent(
			deliveryTenantContext(page, locals.requestId),
			{
				name: 'page_viewed',
				visitorId,
				sessionId,
				...attributionFrom(url, request),
				hostname: page.hostname,
				domainKind: page.domainKind === 'redirect' ? 'production' : page.domainKind,
				siteId: page.siteId,
				funnelId: page.funnelId,
				pageId: page.pageId,
				pageVersionId: page.versionId
			},
			locals.requestId
		);
	} catch (err) {
		logError('delivery.page_viewed', err, { requestId: locals.requestId, clientId: page.clientId });
	}
	return {
		document: page.document,
		domainKind: page.domainKind,
		hostname: page.hostname,
		pathname: url.pathname,
		jsonLdHtml: (() => {
			const jsonLd = jsonLdScript(
				publicJsonLd({
					domainKind: page.domainKind,
					origin: url.origin,
					pathname: url.pathname,
					document: page.document
				})
			);
			return jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : null;
		})()
	};
}

export const actions = {
	event: async ({ request, locals, cookies, url, getClientAddress }) => {
		if (locals.delivery.kind !== 'page') return fail(404, { error: 'Unknown host' });
		const page = locals.delivery;
		const form = await request.formData();
		const name = String(form.get('name') ?? '');
		if (name !== 'form_started' && name !== 'cta_clicked') {
			return fail(400, { error: 'Unknown event' });
		}
		const visitorId = cookieId(cookies.get(VISITOR_COOKIE));
		const sessionId = cookieId(cookies.get(ANALYTICS_SESSION_COOKIE));
		cookies.set(VISITOR_COOKIE, visitorId, analyticsCookieOptions());
		cookies.set(ANALYTICS_SESSION_COOKIE, sessionId, analyticsCookieOptions());
		try {
			await recordDeliveryEvent(
				deliveryTenantContext(page, locals.requestId),
				{
					name: name as 'form_started' | 'cta_clicked',
					visitorId,
					sessionId,
					...attributionFrom(url, request, form),
					hostname: page.hostname,
					domainKind: page.domainKind === 'redirect' ? 'production' : page.domainKind,
					siteId: page.siteId,
					funnelId: page.funnelId,
					pageId: page.pageId,
					pageVersionId: page.versionId
				},
				locals.requestId,
				getClientAddress()
			);
			return { eventAccepted: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			logError('delivery.form_started', err, {
				requestId: locals.requestId,
				clientId: page.clientId,
				ip: getClientAddress()
			});
			return fail(500, { error: 'Could not record event' });
		}
	},
	lead: async ({ request, locals, cookies, url, getClientAddress }) => {
		if (locals.delivery.kind !== 'page') return fail(404, { error: 'Unknown host' });
		const page = locals.delivery;
		const form = await request.formData();
		const values = fieldValues(form);
		if (!values.name.trim()) {
			return fail(400, { error: 'Enter your name so we know who to contact.', ...values });
		}
		if (!values.email.includes('@')) {
			return fail(400, { error: 'Enter a valid email so we can reply.', ...values });
		}
		if (!values.consentLeadFollowUp) {
			return fail(400, { error: 'Consent is required to submit this form.', ...values });
		}
		const visitorId = cookieId(cookies.get(VISITOR_COOKIE));
		const sessionId = cookieId(cookies.get(ANALYTICS_SESSION_COOKIE));
		cookies.set(VISITOR_COOKIE, visitorId, analyticsCookieOptions());
		cookies.set(ANALYTICS_SESSION_COOKIE, sessionId, analyticsCookieOptions());
		try {
			await captureLead(
				deliveryTenantContext(page, locals.requestId),
				{
					...values,
					visitorId,
					sessionId,
					...attributionFrom(url, request, form),
					hostname: page.hostname,
					domainKind: page.domainKind === 'redirect' ? 'production' : page.domainKind,
					siteId: page.siteId,
					funnelId: page.funnelId,
					pageId: page.pageId,
					pageVersionId: page.versionId
				},
				locals.requestId,
				getClientAddress()
			);
			return { accepted: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message, ...values });
			logError('delivery.lead', err, {
				requestId: locals.requestId,
				clientId: page.clientId
			});
			return fail(500, { error: 'Could not submit the request.', ...values });
		}
	}
};
