import { isServicesSection, type PageDocument } from './schema';
import { publicCanonicalUrl, publicPath, type PublicDomainKind } from './meta';

export const AI_RETRIEVAL_CRAWLERS = [
	'GPTBot',
	'ChatGPT-User',
	'OAI-SearchBot',
	'ClaudeBot',
	'anthropic-ai',
	'PerplexityBot',
	'Google-Extended'
] as const;

export type AiCrawlerPolicy = 'allow' | 'disallow';

export type KnowledgeFacts = {
	displayName: string;
	tagline?: string | null;
	offer?: string | null;
	audience?: string | null;
	services: { name: string; outcome: string; summary: string }[];
	claims: { kind: 'approved' | 'prohibited'; statement: string; evidence: string | null }[];
};

export function publicRobotsTxt(input: {
	domainKind: PublicDomainKind;
	origin: string;
	aiCrawlerPolicy?: AiCrawlerPolicy;
}) {
	if (input.domainKind === 'preview') {
		return 'User-agent: *\nDisallow: /\n';
	}
	const origin = input.origin.replace(/\/$/, '');
	const policy = input.aiCrawlerPolicy ?? 'allow';
	const directive = policy === 'allow' ? 'Allow: /' : 'Disallow: /';
	const ai = AI_RETRIEVAL_CRAWLERS.map((agent) => `User-agent: ${agent}\n${directive}`).join(
		'\n\n'
	);
	return `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n\n${ai}\n`;
}

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

export function xmlSitemap(origin: string, paths: string[]) {
	const unique = [...new Set(paths.map((path) => publicPath(path)))].sort();
	const urls = unique
		.map((path) => `\t<url><loc>${escapeXml(publicCanonicalUrl(origin, path))}</loc></url>`)
		.join('');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
}

type JsonLdNode = Record<string, unknown>;

function faqItemsFrom(document: PageDocument) {
	const section = document.sections.find((item) => item.type === 'faq');
	if (!section || section.type !== 'faq') return [];
	return section.items
		.filter((item) => item.question.trim() && item.answer.trim())
		.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: { '@type': 'Answer', text: item.answer }
		}));
}

function servicesFrom(document: PageDocument) {
	const section = document.sections.find((item) => isServicesSection(item));
	if (!section) return [];
	return section.items
		.filter((item) => item.name.trim() && (item.outcome.trim() || item.summary.trim()))
		.map((item) => ({
			'@type': 'Service',
			name: item.name,
			description: [item.outcome, item.summary].filter(Boolean).join(' ')
		}));
}

export function publicJsonLd(input: {
	domainKind: PublicDomainKind;
	origin: string;
	pathname?: string;
	document: PageDocument;
}): { '@context': string; '@graph': JsonLdNode[] } | null {
	if (input.domainKind === 'preview') return null;
	const name = input.document.identity.displayName.trim();
	if (!name) return null;
	const url = publicCanonicalUrl(input.origin, input.pathname ?? '/');
	const origin = input.origin.replace(/\/$/, '');
	const graph: JsonLdNode[] = [
		{
			'@type': 'Organization',
			'@id': `${origin}/#organization`,
			name,
			url: `${origin}/`
		},
		{
			'@type': 'WebSite',
			'@id': `${origin}/#website`,
			name,
			url: `${origin}/`,
			publisher: { '@id': `${origin}/#organization` }
		},
		{
			'@type': 'WebPage',
			'@id': `${url}#webpage`,
			url,
			name: input.document.seo.title,
			description: input.document.seo.description,
			isPartOf: { '@id': `${origin}/#website` },
			about: { '@id': `${origin}/#organization` }
		}
	];
	const faqs = faqItemsFrom(input.document);
	if (faqs.length > 0) {
		graph.push({
			'@type': 'FAQPage',
			'@id': `${url}#faq`,
			mainEntity: faqs,
			isPartOf: { '@id': `${url}#webpage` }
		});
	}
	for (const service of servicesFrom(input.document)) {
		graph.push({
			...service,
			provider: { '@id': `${origin}/#organization` }
		});
	}
	const serialized = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
	if (/"@type":"(AggregateRating|Review)"/.test(serialized) || /"author":/.test(serialized)) {
		return null;
	}
	return { '@context': 'https://schema.org', '@graph': graph };
}

export function jsonLdScript(payload: { '@context': string; '@graph': JsonLdNode[] } | null) {
	if (!payload) return null;
	return JSON.stringify(payload).replaceAll('<', '\\u003c');
}

export function publicLlmsTxt(input: {
	domainKind: PublicDomainKind;
	origin: string;
	knowledge: KnowledgeFacts;
}): string | null {
	if (input.domainKind === 'preview') return null;
	const name = input.knowledge.displayName.trim();
	if (!name) return null;
	const origin = input.origin.replace(/\/$/, '');
	const lines = [`# ${name}`];
	const summary = input.knowledge.offer?.trim() || input.knowledge.tagline?.trim();
	if (summary) lines.push('', `> ${summary}`);
	if (input.knowledge.audience?.trim()) {
		lines.push('', `Audience: ${input.knowledge.audience.trim()}`);
	}
	const services = input.knowledge.services.filter((service) => service.name.trim());
	if (services.length > 0) {
		lines.push('', '## Services');
		for (const service of services) {
			const detail = [service.outcome, service.summary].filter((part) => part.trim()).join(' — ');
			lines.push(detail ? `- ${service.name}: ${detail}` : `- ${service.name}`);
		}
	}
	const facts = input.knowledge.claims.filter(
		(claim) => claim.kind === 'approved' && claim.statement.trim()
	);
	if (facts.length > 0) {
		lines.push('', '## Approved facts');
		for (const fact of facts) {
			lines.push(
				fact.evidence?.trim()
					? `- ${fact.statement.trim()} (${fact.evidence.trim()})`
					: `- ${fact.statement.trim()}`
			);
		}
	}
	lines.push('', `Official website: ${origin}/`, '');
	const body = lines.join('\n');
	if (
		input.knowledge.claims.some(
			(claim) => claim.kind === 'prohibited' && body.includes(claim.statement)
		)
	) {
		return null;
	}
	return body;
}
