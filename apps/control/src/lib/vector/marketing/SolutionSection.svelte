<script lang="ts">
	import VectorGrid from './VectorGrid.svelte';

	const features = [
		{
			title: 'Website and funnels',
			desc: 'High-performance, mobile-first landing pages built for a real conversion path.'
		},
		{
			title: 'SEO, AEO, and GEO',
			desc: 'Search visibility across traditional results and generative engines, without invented rankings.'
		},
		{
			title: 'Content and social',
			desc: 'Coordinated organic presence designed to capture and direct attention.'
		},
		{
			title: 'Creative and email',
			desc: 'Follow-ups and branded assets governed by confirmed visual identity and consent.'
		},
		{
			title: 'Analytics and orchestration',
			desc: 'Observed signals directing every channel toward qualified business outcomes.'
		}
	];
</script>

<section id="how-it-works" class="solution-section">
	<VectorGrid opacity={0.04} fadeEdges={true} />

	<div class="vector-container relative-content">
		<div class="section-header">
			<h2>One team. One system. One relationship.</h2>
			<p class="section-desc">
				Everything required to turn an online presence into a measurable customer-acquisition
				engine.
			</p>
		</div>

		<div class="features-grid">
			{#each features as feature (feature.title)}
				<div class="vector-card feature-card">
					<h3 class="feature-title">{feature.title}</h3>
					<p class="feature-desc">{feature.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.solution-section {
		position: relative;
		padding: var(--space-96) 0;
		background-color: var(--vector-black);
		overflow: hidden;
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
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-24);
		max-width: 1000px;
		margin: 0 auto;
	}

	.feature-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-16);
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

	@media (min-width: 1024px) {
		.features-grid {
			display: flex;
			flex-wrap: wrap;
			justify-content: center;
		}
		.feature-card {
			width: calc(33.333% - 16px);
		}
	}

	@media (max-width: 767px) {
		.solution-section {
			padding: var(--space-64) 0;
		}
		.section-header {
			margin-bottom: var(--space-40);
		}
		.features-grid {
			display: grid;
			grid-template-columns: 1fr;
		}
		.feature-card {
			width: 100%;
		}
	}
</style>
