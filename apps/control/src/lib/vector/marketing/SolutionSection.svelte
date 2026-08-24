<script lang="ts">
	import { onMount } from 'svelte';
	import VectorGrid from './VectorGrid.svelte';

	let isVisible = $state(false);
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

	const features = [
		{
			id: 'funnels',
			title: 'Website and funnels',
			desc: 'High-performance, mobile-first landing pages built for a real conversion path.',
			icon: 'layout'
		},
		{
			id: 'seo',
			title: 'SEO, AEO, and GEO',
			desc: 'Search visibility across results and generative engines, without invented rankings.',
			icon: 'search'
		},
		{
			id: 'content',
			title: 'Content and social',
			desc: 'Coordinated organic presence designed to capture and direct high-intent attention.',
			icon: 'megaphone'
		},
		{
			id: 'creative',
			title: 'Creative and email',
			desc: 'Follow-ups and branded assets governed by confirmed visual identity and user consent.',
			icon: 'palette'
		},
		{
			id: 'analytics',
			title: 'Analytics and orchestration',
			desc: 'Observed revenue signals directing every channel toward qualified business outcomes.',
			icon: 'chart'
		},
		{
			id: 'reports',
			title: 'Reporting and insights',
			desc: 'Reporting and insights to understand the impact of your growth efforts.',
			icon: 'chart'
		}
	];
</script>

<section id="how-it-works" class="solution-section" bind:this={sectionRef}>
	<div class="ambient-glow solution-glow"></div>
	<VectorGrid opacity={0.04} fadeEdges={true} />

	<div class="vector-container relative-content">
		<div class="section-header reveal-up" class:is-visible={isVisible}>
			<h2>
				One team. One system.<br />
				<span class="highlight">One relationship.</span>
			</h2>
			<p class="section-desc">
				Everything required to turn your presence into a measurable customer-acquisition engine.
			</p>
		</div>

		<div class="features-grid">
			{#each features as feature, i (feature.title)}
				<div
					class="vector-card feature-card reveal-up"
					class:is-visible={isVisible}
					style="transition-delay: {i * 80 + 100}ms"
				>
					<div class="feature-icon">
						{#if feature.icon === 'layout'}
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--vector-cyan)"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect x="3" y="3" width="18" height="18" rx="2" />
								<path d="M3 9h18" />
								<path d="M9 21V9" />
							</svg>
						{:else if feature.icon === 'search'}
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--vector-cyan)"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
								<path d="M11 8v6M8 11h6" />
							</svg>
						{:else if feature.icon === 'megaphone'}
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--vector-cyan)"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M3 11l18-5v12L3 13v-2z" />
								<path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
							</svg>
						{:else if feature.icon === 'palette'}
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--vector-cyan)"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path
									d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
								/>
								<polyline points="22,6 12,13 2,6" />
							</svg>
						{:else if feature.icon === 'chart'}
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--vector-cyan)"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="18" y1="20" x2="18" y2="10" />
								<line x1="12" y1="20" x2="12" y2="4" />
								<line x1="6" y1="20" x2="6" y2="14" />
							</svg>
						{/if}
					</div>
					<h3 class="feature-title">{feature.title}</h3>
					<p class="feature-desc">{feature.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.highlight {
		background: linear-gradient(135deg, var(--vector-blue) 0%, var(--vector-cyan) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.solution-section {
		position: relative;
		padding-block: var(--section-padding-y, clamp(64px, 8vw, 120px));
		background-color: var(--vector-black);
		overflow: hidden;
	}

	.solution-glow {
		width: 800px;
		height: 800px;
		background: radial-gradient(circle at 50% 50%, rgba(53, 217, 255, 0.05) 0%, transparent 60%);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.relative-content {
		position: relative;
		z-index: 10;
	}

	.section-header {
		text-align: center;
		max-width: 720px;
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

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-24);
		max-width: 1100px;
		margin: 0 auto;
	}

	.feature-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-16);
		transition:
			transform 300ms var(--ease-standard),
			box-shadow 300ms var(--ease-standard),
			border-color 300ms var(--ease-standard);
	}

	.feature-card:hover {
		transform: translateY(-4px);
		box-shadow:
			0 12px 40px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		border-color: rgba(53, 217, 255, 0.3);
	}

	.feature-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(53, 217, 255, 0.1);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-8);
		transition: transform 300ms var(--ease-standard);
	}

	.feature-card:hover .feature-icon {
		transform: scale(1.1);
	}

	.feature-icon svg {
		width: 20px;
		height: 20px;
	}

	.feature-title {
		font-family: var(--font-primary);
		font-size: 18px;
		font-weight: 600;
		color: var(--vector-white);
	}

	.feature-desc {
		font-size: 15px;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	@media (max-width: 767px) {
		.solution-section {
			padding-block: var(--space-48);
		}
		.section-header {
			margin-bottom: var(--space-40);
		}
		.features-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
