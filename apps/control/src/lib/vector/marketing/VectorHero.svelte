<script lang="ts">
	import HeroSignalGraph from './HeroSignalGraph.svelte';
</script>

<section class="vector-hero" aria-labelledby="hero-heading">
	<div class="ambient-glow hero-glow"></div>
	<div class="vector-container">
		<div class="hero-split">
			<div class="hero-copy">
				<p class="eyebrow">Autonomous growth infrastructure</p>
				<h1 id="hero-heading">
					Turn every<br />
					signal into<br />
					<span class="highlight">growth.</span>
				</h1>
				<p class="supporting-copy">
					Stop managing fragmented agencies. Manage your business. Vector builds and operates the
					customer-acquisition engine behind your business.
				</p>
				<div class="cta-group">
					<a class="vector-btn vector-btn-primary" href="#get-started">Request Growth Audit</a>
					<a class="vector-btn vector-btn-secondary" href="/login">Explore Vector</a>
				</div>
			</div>
			<div class="hero-visual" aria-hidden="true">
				<HeroSignalGraph />
			</div>
		</div>
	</div>
</section>

<style>
	.vector-hero {
		position: relative;
		padding-top: var(--space-48);
		padding-bottom: var(--space-64);
		overflow: hidden;
	}

	.hero-split {
		display: grid;
		grid-template-columns: 44% 56%;
		gap: var(--space-48);
		align-items: center;
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
		gap: var(--space-24);
		z-index: 10;
	}

	.eyebrow {
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.1em;
		color: var(--vector-steel);
		text-transform: uppercase;
	}

	.highlight {
		background: linear-gradient(135deg, var(--vector-blue) 0%, var(--vector-cyan) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.supporting-copy {
		max-width: 480px;
		font-size: 17px;
	}

	.cta-group {
		display: flex;
		gap: var(--space-16);
		margin-top: var(--space-8);
		flex-wrap: wrap;
	}

	.hero-visual {
		position: relative;
		height: 100%;
		min-height: 500px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-glow {
		width: 600px;
		height: 600px;
		background: radial-gradient(circle at 50% 50%, rgba(22, 119, 255, 0.08) 0%, transparent 60%);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	@media (max-width: 1023px) {
		.hero-split {
			grid-template-columns: 1fr;
			gap: var(--space-64);
		}

		.hero-copy {
			align-items: center;
			text-align: center;
		}

		.supporting-copy {
			margin-inline: auto;
		}

		.cta-group {
			justify-content: center;
		}
	}

	@media (max-width: 767px) {
		.vector-hero {
			padding-top: var(--space-40);
			padding-bottom: var(--space-40);
			min-height: auto;
		}

		.hero-split {
			display: flex;
			flex-direction: column;
			gap: var(--space-40);
		}

		.cta-group {
			width: 100%;
			flex-direction: column;
		}

		.cta-group :global(.vector-btn) {
			width: 100%;
		}

		.hero-visual {
			min-height: 350px;
			width: 100%;
		}
	}
</style>
