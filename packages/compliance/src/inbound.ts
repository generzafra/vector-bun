export const INBOUND_REVIEW_CLASSES = [
	'legal',
	'refund',
	'dispute',
	'pricing',
	'complaint',
	'negotiation',
	'general'
] as const;

export type InboundReviewClass = (typeof INBOUND_REVIEW_CLASSES)[number];

const CLASS_PATTERNS: Array<{
	classification: Exclude<InboundReviewClass, 'general'>;
	pattern: RegExp;
}> = [
	{
		classification: 'legal',
		pattern: /\b(lawsuit|attorney|lawyer|subpoena|legal action|gdpr request)\b/i
	},
	{ classification: 'refund', pattern: /\b(refund|chargeback|money back)\b/i },
	{ classification: 'dispute', pattern: /\b(dispute|fraudulent charge)\b/i },
	{
		classification: 'pricing',
		pattern: /\b(price match|special pricing|discount exception|unapproved price)\b/i
	},
	{ classification: 'negotiation', pattern: /\b(negotiate|contract terms|material terms)\b/i },
	{
		classification: 'complaint',
		pattern: /\b(formal complaint|terrible service|worst experience)\b/i
	}
];

export function classifyInboundReply(
	subject: string,
	textBody: string
): {
	classification: InboundReviewClass;
	requiresHumanReview: boolean;
	autoReplyAllowed: false;
} {
	const haystack = `${subject}\n${textBody}`;
	const match = CLASS_PATTERNS.find((rule) => rule.pattern.test(haystack));
	const classification: InboundReviewClass = match?.classification ?? 'general';
	return {
		classification,
		requiresHumanReview: classification !== 'general',
		autoReplyAllowed: false
	};
}
