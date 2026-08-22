import { ProviderError, ValidationError } from '@vector/contracts';
import type {
	AIHealth,
	AIProvider,
	StructuredRequest,
	StructuredResult,
	TextRequest,
	TextResult,
	ToolRequest,
	ToolResult
} from './types';
import type { AnalyticsOutput, CopyOutput, FunnelPlanOutput, ResearchOutput } from './outputs';

const MEMORY_COST_MICROS = 1_000;

export class MemoryAIProvider implements AIProvider {
	readonly structuredRequests: Array<StructuredRequest<unknown>> = [];
	readonly textRequests: TextRequest[] = [];
	toolCallCount = 0;
	nextStructured: unknown | null = null;
	nextError: Error | null = null;

	async generateStructured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>> {
		this.structuredRequests.push(request as StructuredRequest<unknown>);
		if (this.nextError) {
			const error = this.nextError;
			this.nextError = null;
			throw error;
		}
		const started = Date.now();
		const raw = this.nextStructured ?? this.fixture(request);
		this.nextStructured = null;
		const parsed = request.schema.safeParse(raw);
		if (!parsed.success) {
			throw new ValidationError('Structured output failed validation');
		}
		if (request.costCeilingMicros !== undefined && MEMORY_COST_MICROS > request.costCeilingMicros) {
			throw new ProviderError('AI cost ceiling exceeded', 'AI_COST_CEILING');
		}
		return {
			output: parsed.data,
			provider: 'memory',
			model: request.model ?? 'memory-v1',
			providerRequestId: `mem-${request.idempotencyKey}`,
			latencyMs: Date.now() - started,
			promptTokens: 40,
			completionTokens: 80,
			totalTokens: 120,
			costMicros: MEMORY_COST_MICROS,
			currency: 'USD'
		};
	}

	async generateText(request: TextRequest): Promise<TextResult> {
		this.textRequests.push(request);
		return {
			text: 'Natural language is not an execution contract.',
			provider: 'memory',
			model: request.model ?? 'memory-v1',
			providerRequestId: `mem-text-${request.idempotencyKey}`,
			latencyMs: 1,
			promptTokens: 10,
			completionTokens: 10,
			totalTokens: 20,
			costMicros: MEMORY_COST_MICROS,
			currency: 'USD'
		};
	}

	async useTools(_request: ToolRequest): Promise<ToolResult> {
		this.toolCallCount += 1;
		throw new ProviderError(
			'Production agents cannot invoke tools in Phase 4',
			'AI_TOOLS_DISABLED'
		);
	}

	async health(): Promise<AIHealth> {
		return {
			ok: true,
			adapter: 'memory',
			detail: `${this.structuredRequests.length} structured runs`
		};
	}

	reset() {
		this.structuredRequests.length = 0;
		this.textRequests.length = 0;
		this.toolCallCount = 0;
		this.nextStructured = null;
		this.nextError = null;
	}

	private fixture<T>(request: StructuredRequest<T>): unknown {
		const knowledge = request.facts.knowledge;
		const analytics = request.facts.analytics;
		if (request.schemaName === 'research.v1') {
			const research: ResearchOutput = {
				summary: `Research draft for ${knowledge.brandName ?? 'this client'} using approved knowledge only.`,
				audienceInsights: knowledge.audience
					? [knowledge.audience]
					: ['Audience is not yet documented.'],
				competitorObservations: ['Competitor observations are hypotheses, not approved facts.'],
				opportunities: [
					{
						title: 'Clarify the primary conversion',
						evidence:
							knowledge.primaryConversion ?? knowledge.offer ?? 'Offer is documented in knowledge.',
						priority: 'medium'
					}
				],
				claimsUsed: knowledge.approvedClaims,
				knowledgeAuthority: 'approved_knowledge',
				finding: `Approved knowledge for ${knowledge.brandName ?? 'the tenant'} can support a research brief.`,
				proposedAction: 'Review the research brief. Do not publish or send from this output.',
				expectedImpact: 'Operator can decide whether to commission copy or a funnel plan.',
				riskClass: 'low',
				confidence: 62,
				recommendedAutonomy: 1
			};
			return research;
		}
		if (request.schemaName === 'copy.v1') {
			const claim = knowledge.approvedClaims[0] ?? knowledge.offer ?? 'the documented offer';
			const copy: CopyOutput = {
				kind: 'headline',
				variants: [
					{ label: 'Primary', text: `${knowledge.brandName ?? 'This brand'}: ${claim}` },
					{ label: 'Alternate', text: `Ask about ${knowledge.offer ?? 'the documented offer'}.` }
				],
				prohibitedClaimHits: [],
				usesApprovedClaims: knowledge.approvedClaims.length > 0,
				finding: 'Draft headlines from approved claims only.',
				proposedAction: 'Choose a variant or reject. Copy is not published from this run.',
				expectedImpact: 'A clearer hero line after human review.',
				riskClass: 'content',
				confidence: 55,
				recommendedAutonomy: 1
			};
			return copy;
		}
		if (request.schemaName === 'analytics.v1') {
			const analyticsOut: AnalyticsOutput = {
				summary: `Tenant production funnel: ${analytics.pageViewed} views, ${analytics.leadCreated} leads.`,
				anomalies:
					analytics.pageViewed > 0 && analytics.leadCreated === 0
						? [
								{
									metric: 'lead_created',
									observation: 'Views exist without leads.',
									evidence: `${analytics.pageViewed} page_viewed, ${analytics.leadCreated} lead_created`
								}
							]
						: [],
				funnelLoss: [
					{
						stage: 'cta_clicked',
						observation: `${analytics.pageViewed} viewed → ${analytics.ctaClicked} clicked`
					}
				],
				finding: 'Analytics draft uses this tenant’s Postgres counts only.',
				proposedAction: 'Review the explanation. Vector will not change pages or campaigns.',
				expectedImpact: 'Operator can decide a next measurement or copy change.',
				riskClass: 'low',
				confidence: 48,
				recommendedAutonomy: 2
			};
			return analyticsOut;
		}
		const funnel: FunnelPlanOutput = {
			audience: knowledge.audience ?? 'Documented audience is missing.',
			primaryConversion: knowledge.primaryConversion ?? 'Request a consult',
			narrative: `Outcome first, then proof, then ${knowledge.primaryConversion ?? 'the documented conversion'}.`,
			sections: [
				{ type: 'hero-minimal', purpose: 'State the outcome and primary conversion.' },
				{ type: 'proof', purpose: 'Use approved claims only.' },
				{ type: 'services', purpose: knowledge.services[0] ?? 'List documented services.' },
				{ type: 'lead-form', purpose: 'Capture the primary conversion with consent.' }
			],
			experimentHypotheses: ['A shorter hero lede may improve form_started.'],
			finding: 'A page plan can be drafted from approved section types.',
			proposedAction: 'Review the section plan. Do not write HTML or publish from this run.',
			expectedImpact: 'A structured draft for the funnel composer after approval.',
			riskClass: 'content',
			confidence: 51,
			recommendedAutonomy: 1
		};
		return funnel;
	}
}
