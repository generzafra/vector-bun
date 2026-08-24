<script lang="ts">
	import { onMount } from 'svelte';

	let isVisible = $state(false);
	let openIndex = $state<number | null>(0); // First item open by default
	let sectionRef: HTMLElement;

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					isVisible = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);

		if (sectionRef) {
			observer.observe(sectionRef);
		}

		return () => observer.disconnect();
	});

	function toggle(index: number) {
		openIndex = openIndex === index ? null : index;
	}

	const faqs = [
		{
			q: 'How quickly does Vector deploy our customer acquisition engine?',
			a: 'Vector is built for rapid deployment. Initial setup and custom domain configuration typically take less than 48 hours. Once connected, your website, funnels, search indexing (SEO/AEO/GEO), and analytics pipeline begin operating immediately.'
		},
		{
			q: 'Does Vector replace our existing website or run on our custom domain?',
			a: 'Vector serves high-performance landing pages, funnels, and marketing experiences directly on your verified custom domain (e.g., yourcompany.com). You maintain 100% brand ownership without managing individual server deployments.'
		},
		{
			q: 'How does Vector track and prove real revenue attribution?',
			a: 'Vector uses a purpose-built attribution engine that correlates multi-channel traffic signals (organic search, generative AI search, direct funnels, and email) with verified lead captures and pipeline events. No guessed or invented analytics.'
		},
		{
			q: 'What input or time commitment is required from our team?',
			a: 'Vector operates autonomously so you can focus on running your business. During onboarding, you define your brand profile and target audience. From there, Vector proposes actions, enforces consent policies, and handles campaign execution.'
		},
		{
			q: 'How are AI and automated marketing actions governed?',
			a: 'AI in Vector proposes actions, policy decides, and trusted software executes. Sensitive changes, broad campaign launches, and outbound communications follow your configured approval rules, ensuring total brand safety and governance.'
		}
	];
</script>

<section id="faq" class="faq-section" bind:this={sectionRef}>
	<div class="vector-container">
		<div class="section-header reveal-up" class:is-visible={isVisible}>
			<h2>Frequently asked questions</h2>
			<p class="section-desc">
				Everything you need to know about how Vector operates your digital acquisition engine.
			</p>
		</div>

		<div class="faq-list reveal-up" class:is-visible={isVisible} style="transition-delay: 150ms;">
			{#each faqs as faq, i (faq.q)}
				{@const isOpen = openIndex === i}
				<div class="faq-item" class:open={isOpen}>
					<button
						type="button"
						class="faq-trigger"
						aria-expanded={isOpen}
						aria-controls={`faq-answer-${i}`}
						onclick={() => toggle(i)}
					>
						<span class="faq-question">{faq.q}</span>
						<span class="faq-icon" aria-hidden="true">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="6 9 12 15 18 9"></polyline>
							</svg>
						</span>
					</button>
					{#if isOpen}
						<div id={`faq-answer-${i}`} class="faq-answer" role="region">
							<p>{faq.a}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.faq-section {
		position: relative;
		padding-block: var(--section-padding-y, clamp(64px, 8vw, 120px));
		background-color: var(--bg-1);
		border-top: 1px solid var(--border-subtle);
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-header {
		text-align: center;
		max-width: 680px;
		margin: 0 auto var(--space-64);
	}

	.section-header h2 {
		margin-bottom: var(--space-24);
		color: var(--vector-white);
	}

	.section-desc {
		font-size: 17px;
		color: var(--text-secondary);
	}

	.faq-list {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-16);
	}

	.faq-item {
		background: var(--vector-graphite);
		border: 1px solid var(--vector-border);
		border-radius: var(--radius-card);
		overflow: hidden;
		transition: border-color 200ms var(--ease-standard);
	}

	.faq-item.open {
		border-color: rgba(53, 217, 255, 0.3);
	}

	.faq-trigger {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-16);
		padding: var(--space-20) var(--space-24);
		background: none;
		border: none;
		color: var(--vector-white);
		font-family: var(--font-primary);
		font-size: 17px;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
		outline: none;
	}

	.faq-trigger:focus-visible {
		outline: 2px solid var(--vector-cyan);
		outline-offset: -2px;
	}

	.faq-question {
		flex: 1;
	}

	.faq-icon {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--vector-cyan);
		transition: transform 250ms var(--ease-standard);
		flex-shrink: 0;
	}

	.faq-item.open .faq-icon {
		transform: rotate(180deg);
	}

	.faq-icon svg {
		width: 18px;
		height: 18px;
	}

	.faq-answer {
		padding: 0 var(--space-24) var(--space-20);
	}

	.faq-answer p {
		font-size: 15px;
		line-height: 1.6;
		color: var(--text-secondary);
		margin: 0;
	}

	@media (max-width: 767px) {
		.faq-section {
			padding-block: var(--space-48);
		}

		.faq-trigger {
			padding: var(--space-16) var(--space-20);
			font-size: 15px;
		}

		.faq-answer {
			padding: 0 var(--space-20) var(--space-16);
		}
	}
</style>
