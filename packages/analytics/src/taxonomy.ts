export const EVENT_TAXONOMY_VERSION = 1;

export const CORE_EVENTS = [
	'page_viewed',
	'form_started',
	'form_submitted',
	'lead_created'
] as const;

export type CoreEventName = (typeof CORE_EVENTS)[number];

export function isTaxonomyEvent(name: string): name is CoreEventName {
	return (CORE_EVENTS as readonly string[]).includes(name);
}
