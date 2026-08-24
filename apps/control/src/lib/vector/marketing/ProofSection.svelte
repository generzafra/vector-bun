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
			{ threshold: 0.2 }
		);

		if (sectionRef) {
			observer.observe(sectionRef);
		}

		return () => observer.disconnect();
	});

	const metrics = [
		{ label: 'QUALIFIED PIPELINE', val: '$284,500', trend: '+34%' },
		{ label: 'ATTRIBUTABLE LEADS', val: '142', trend: '+28%' },
		{ label: 'CONVERSION RATE', val: '4.8%', trend: '+1.2%' }
	];

	const channels = [
		{ name: 'Organic Search (SEO)', share: '42%' },
		{ name: 'Generative AI (GEO)', share: '26%' },
		{ name: 'Direct & Funnels', share: '18%' },
		{ name: 'Email Follow-ups', share: '14%' }
	];
</script>

<section id="outcomes" class="proof-section" bind:this={sectionRef}>
	<div class="grid-mask">
		<VectorGrid opacity={0.06} fadeEdges={false} />
	</div>
	<div class="vector-container">
		<div class="proof-split">
			<div class="proof-copy reveal-up" class:is-visible={isVisible}>
				<h2>Full visibility into attributable growth.</h2>
				<p class="section-desc">
					Watch signals convert into qualified leads and business outcomes in real time. Track
					channel performance, campaign decisions, and revenue attribution from one unified,
					transparent workspace.
				</p>
				<a class="vector-btn vector-btn-primary" href="#get-started">Request Growth Audit</a>
			</div>
			<div
				class="proof-visual reveal-up"
				class:is-visible={isVisible}
				style="transition-delay: 200ms;"
			>
				<div class="vector-card mockup-card floating-mockup">
					<div class="mockup-header">
						<div class="mockup-title">
							<span class="status-dot"></span>
							Engine Workspace
						</div>
						<div class="mockup-note">Scored Audit</div>
					</div>
					<div class="mockup-body">
						<div class="metrics-grid">
							{#each metrics as item (item.label)}
								<div class="metric-item">
									<div class="metric-label">{item.label}</div>
									<div class="metric-val-row">
										<span class="metric-val">{item.val}</span>
										<span class="metric-trend">{item.trend}</span>
									</div>
								</div>
							{/each}
						</div>

						<div class="channels-block">
							<div class="block-title">Attribution Breakdown</div>
							<div class="channel-bars">
								{#each channels as ch (ch.name)}
									<div class="channel-row">
										<span class="ch-name">{ch.name}</span>
										<div class="bar-track">
											<div class="bar-fill" style="width: {ch.share}"></div>
										</div>
										<span class="ch-share">{ch.share}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.proof-section {
		position: relative;
		padding-block: var(--section-padding-y, clamp(64px, 8vw, 120px));
		background-color: var(--bg-0);
		overflow: hidden;
	}

	.grid-mask {
		position: absolute;
		inset: 0;
		mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
		-webkit-mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
		z-index: 0;
	}

	.proof-split {
		position: relative;
		z-index: 10;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-64);
		align-items: center;
	}

	.proof-copy h2 {
		color: var(--vector-white);
		margin-bottom: var(--space-24);
	}

	.section-desc {
		font-size: 17px;
		color: var(--text-secondary);
		margin-bottom: var(--space-40);
	}

	.mockup-card {
		padding: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		border: 1px solid rgba(53, 217, 255, 0.2);
		background: rgba(16, 16, 20, 0.9);
	}

	.mockup-header {
		padding: var(--space-16) var(--space-24);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(0, 0, 0, 0.3);
		gap: var(--space-12);
	}

	.status-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--vector-mint, #32e6a1);
		box-shadow: 0 0 8px var(--vector-mint, #32e6a1);
		margin-right: 6px;
	}

	.mockup-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--vector-white);
		display: flex;
		align-items: center;
	}

	.mockup-note {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--vector-cyan);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.mockup-body {
		padding: var(--space-24);
		display: flex;
		flex-direction: column;
		gap: var(--space-24);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-16);
	}

	.metric-item {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: var(--space-12);
	}

	.metric-label {
		font-family: var(--font-mono);
		font-size: 9px;
		color: var(--text-tertiary);
		letter-spacing: 0.05em;
		margin-bottom: 4px;
	}

	.metric-val-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 4px;
	}

	.metric-val {
		font-size: 16px;
		font-weight: 700;
		color: var(--vector-white);
	}

	.metric-trend {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--vector-mint, #32e6a1);
	}

	.channels-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-12);
	}

	.block-title {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.channel-bars {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.channel-row {
		display: flex;
		align-items: center;
		gap: var(--space-12);
		font-size: 12px;
	}

	.ch-name {
		width: 140px;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar-track {
		flex: 1;
		height: 6px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 3px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--vector-blue) 0%, var(--vector-cyan) 100%);
		border-radius: 3px;
	}

	.ch-share {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--vector-white);
		width: 36px;
		text-align: right;
	}

	.floating-mockup {
		animation: float 6s ease-in-out infinite;
	}

	@keyframes float {
		0% {
			transform: translateY(-8px);
		}
		50% {
			transform: translateY(8px);
		}
		100% {
			transform: translateY(-8px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.floating-mockup {
			animation: none;
		}
	}

	@media (max-width: 1023px) {
		.proof-split {
			grid-template-columns: 1fr;
		}

		.proof-copy {
			text-align: center;
		}
	}

	@media (max-width: 767px) {
		.proof-section {
			padding-block: var(--space-48);
		}

		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.ch-name {
			width: 110px;
			font-size: 11px;
		}
	}
</style>
