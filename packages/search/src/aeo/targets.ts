import type {
	AnswerTargetIntent,
	AnswerTargetSourceKind,
	SchemaEntityKind,
	SchemaEntitySourceKind
} from '@vector/contracts';

export type AeoKnowledge = {
	brand: {
		id: string;
		displayName: string;
		tagline: string | null;
		offer: string | null;
	} | null;
	services: { id: string; name: string; outcome: string; summary: string }[];
	offers: { id: string; name: string; summary: string }[];
	claims: {
		id: string;
		kind: 'approved' | 'prohibited';
		statement: string;
		evidence: string | null;
	}[];
};

export type ProposedEntity = {
	kind: SchemaEntityKind;
	sourceKind: SchemaEntitySourceKind;
	sourceId: string;
	name: string;
	fact: string;
};

export type ProposedTarget = {
	sourceKind: AnswerTargetSourceKind;
	sourceId: string;
	intent: AnswerTargetIntent;
	question: string;
	answer: string;
};

export type PublishedFaq = {
	pageId: string;
	path: string;
	question: string;
	answer: string;
};

export function normalizeAeoText(value: string) {
	return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function clip(value: string, max: number) {
	const trimmed = value.trim();
	return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

function prohibitedStatements(knowledge: AeoKnowledge) {
	return knowledge.claims
		.filter((claim) => claim.kind === 'prohibited' && claim.statement.trim())
		.map((claim) => normalizeAeoText(claim.statement));
}

function containsProhibited(value: string, banned: string[]) {
	const haystack = normalizeAeoText(value);
	return banned.some((statement) => statement && haystack.includes(statement));
}

export function proposeSchemaEntities(knowledge: AeoKnowledge): ProposedEntity[] {
	const banned = prohibitedStatements(knowledge);
	const entities: ProposedEntity[] = [];
	if (knowledge.brand?.displayName.trim()) {
		const fact = clip(
			knowledge.brand.tagline?.trim() ||
				knowledge.brand.offer?.trim() ||
				knowledge.brand.displayName,
			400
		);
		if (fact && !containsProhibited(fact, banned)) {
			entities.push({
				kind: 'organization',
				sourceKind: 'brand',
				sourceId: knowledge.brand.id,
				name: clip(knowledge.brand.displayName, 160),
				fact
			});
		}
	}
	for (const service of knowledge.services) {
		const fact = clip(
			[service.outcome, service.summary].filter((part) => part.trim()).join(' '),
			400
		);
		if (!service.name.trim() || !fact || containsProhibited(fact, banned)) continue;
		entities.push({
			kind: 'service',
			sourceKind: 'service',
			sourceId: service.id,
			name: clip(service.name, 160),
			fact
		});
	}
	for (const offer of knowledge.offers) {
		const fact = clip(offer.summary, 400);
		if (!offer.name.trim() || !fact || containsProhibited(fact, banned)) continue;
		entities.push({
			kind: 'offer',
			sourceKind: 'offer',
			sourceId: offer.id,
			name: clip(offer.name, 160),
			fact
		});
	}
	return entities;
}

export function proposeAnswerTargets(knowledge: AeoKnowledge): ProposedTarget[] {
	const banned = prohibitedStatements(knowledge);
	const targets: ProposedTarget[] = [];
	const push = (target: ProposedTarget) => {
		if (!target.question || !target.answer) return;
		if (containsProhibited(target.question, banned) || containsProhibited(target.answer, banned)) {
			return;
		}
		targets.push(target);
	};

	if (knowledge.brand?.displayName.trim()) {
		const answer = clip(
			knowledge.brand.tagline?.trim() || knowledge.brand.offer?.trim() || '',
			400
		);
		if (answer) {
			push({
				sourceKind: 'brand',
				sourceId: knowledge.brand.id,
				intent: 'definition',
				question: clip(`What is ${knowledge.brand.displayName}?`, 160),
				answer
			});
		}
	}

	for (const service of knowledge.services) {
		const answer = clip(`${service.outcome} ${service.summary}`, 400);
		if (!service.name.trim() || !answer) continue;
		push({
			sourceKind: 'service',
			sourceId: service.id,
			intent: 'use_case',
			question: clip(`What outcome does ${service.name} produce?`, 160),
			answer
		});
	}

	for (const offer of knowledge.offers) {
		const answer = clip(offer.summary, 400);
		if (!offer.name.trim() || !answer) continue;
		push({
			sourceKind: 'offer',
			sourceId: offer.id,
			intent: 'definition',
			question: clip(`What is ${offer.name}?`, 160),
			answer
		});
	}

	for (const claim of knowledge.claims) {
		if (claim.kind !== 'approved' || !claim.statement.trim()) continue;
		const statement = clip(claim.statement, 400);
		const answer = clip(
			claim.evidence?.trim() ? `${statement} (${claim.evidence.trim()})` : statement,
			400
		);
		const question = statement.endsWith('?')
			? clip(statement, 160)
			: clip('What can we confirm today?', 160);
		push({
			sourceKind: 'knowledge_claim',
			sourceId: claim.id,
			intent: 'definition',
			question,
			answer
		});
	}

	return targets;
}

export function faqCoversTarget(
	target: { question: string; answer: string },
	faq: { question: string; answer: string }
) {
	const question = normalizeAeoText(target.question);
	const answer = normalizeAeoText(target.answer);
	const faqQuestion = normalizeAeoText(faq.question);
	const faqAnswer = normalizeAeoText(faq.answer);
	if (!answer) return false;
	const statement = normalizeAeoText(target.answer.split(' (')[0] ?? target.answer);
	if (
		question &&
		faqQuestion === question &&
		(faqAnswer.includes(answer) || answer.includes(faqAnswer))
	) {
		return true;
	}
	if (answer.length >= 12 && faqAnswer.includes(answer)) return true;
	if (statement.length >= 12 && faqAnswer.includes(statement)) return true;
	return false;
}

export function coverAnswerTarget(target: ProposedTarget, faqs: PublishedFaq[]) {
	const match = faqs.find((faq) => faqCoversTarget(target, faq));
	return match
		? { status: 'mapped' as const, pageId: match.pageId, path: match.path }
		: { status: 'gap' as const, pageId: null, path: null };
}
