export type DeliveryBrowserEvent = 'form_started' | 'cta_clicked';

export function emitDeliveryEvent(name: DeliveryBrowserEvent) {
	const payload = new FormData();
	payload.set('name', name);
	payload.set('landingUrl', window.location.href);
	if (document.referrer) payload.set('referrer', document.referrer);
	void fetch('?/event', { method: 'POST', body: payload });
}
