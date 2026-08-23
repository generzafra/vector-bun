import { GEO_QUERY_LIMIT, type GeoQueryGroup, type GeoQuerySourceKind } from '@vector/contracts';

export type GeoKnowledge = {
	brand: {
		id: string;
		displayName: string;
		primaryConversion: string | null;
	} | null;
	services: { id: string; name: string }[];
	offers: { id: string; name: string }[];
	claims: { kind: 'approved' | 'prohibited'; statement: string }[];
};

export type ProposedGeoQuery = {
	query: string;
	group: GeoQueryGroup;
	sourceKind: GeoQuerySourceKind;
	sourceId: string;
	locale: string;
	country: string;
	language: string;
	priority: number;
};

function normalizeQuery(value: string) {
	return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function clip(value: string, max: number) {
	const trimmed = value.trim();
	return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

export function proposeGeoQueries(
	knowledge: GeoKnowledge,
	limit = GEO_QUERY_LIMIT
): ProposedGeoQuery[] {
	const banned = knowledge.claims
		.filter((claim) => claim.kind === 'prohibited' && claim.statement.trim())
		.map((claim) => normalizeQuery(claim.statement));
	const seen = new Set<string>();
	const queries: ProposedGeoQuery[] = [];

	const push = (input: ProposedGeoQuery) => {
		const query = clip(input.query, 160);
		const key = normalizeQuery(query);
		if (!query || seen.has(key) || queries.length >= limit) return;
		if (banned.some((statement) => statement && key.includes(statement))) return;
		seen.add(key);
		queries.push({ ...input, query });
	};

	if (knowledge.brand?.displayName.trim()) {
		push({
			query: knowledge.brand.displayName,
			group: 'brand',
			sourceKind: 'brand',
			sourceId: knowledge.brand.id,
			locale: 'en',
			country: '',
			language: 'en',
			priority: 10
		});
		if (knowledge.brand.primaryConversion?.trim()) {
			push({
				query: `${knowledge.brand.displayName} ${knowledge.brand.primaryConversion}`,
				group: 'high_intent',
				sourceKind: 'brand',
				sourceId: knowledge.brand.id,
				locale: 'en',
				country: '',
				language: 'en',
				priority: 20
			});
		}
	}

	for (const service of knowledge.services) {
		if (!service.name.trim()) continue;
		push({
			query: service.name,
			group: 'service',
			sourceKind: 'service',
			sourceId: service.id,
			locale: 'en',
			country: '',
			language: 'en',
			priority: 30
		});
	}

	for (const offer of knowledge.offers) {
		if (!offer.name.trim()) continue;
		push({
			query: offer.name,
			group: 'product',
			sourceKind: 'offer',
			sourceId: offer.id,
			locale: 'en',
			country: '',
			language: 'en',
			priority: 40
		});
	}

	return queries;
}
