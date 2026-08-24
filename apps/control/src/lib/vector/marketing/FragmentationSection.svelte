<script lang="ts">
	import { onMount } from 'svelte';

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

	// Concrete hex — Control tokens do not define --vector-red / --vector-amber
	const RED = '#ef4444';
	const AMBER = '#f5a524';
	const STEEL = '#8995a5';

	const nodes = [
		{ id: 'web', x: 65, y: 50, label: 'WEB DEV', color: AMBER, warn: true, delay: 0 },
		{ id: 'seo', x: 185, y: 35, label: 'SEO', color: STEEL, warn: true, delay: 0.4 },
		{ id: 'social', x: 310, y: 45, label: 'SOCIAL', color: RED, warn: false, delay: 0.8 },
		{ id: 'ads', x: 440, y: 55, label: 'ADS', color: RED, warn: false, delay: 1.2 },
		{ id: 'email', x: 110, y: 145, label: 'EMAIL', color: STEEL, warn: true, delay: 0.2 },
		{ id: 'analytics', x: 235, y: 155, label: 'ANALYTICS', color: AMBER, warn: true, delay: 0.6 },
		{ id: 'crm', x: 360, y: 140, label: 'CRM', color: STEEL, warn: true, delay: 1.0 },
		{ id: 'content', x: 485, y: 145, label: 'CONTENT', color: AMBER, warn: true, delay: 1.4 }
	];

	const edges = [
		{ source: 0, target: 1, type: 'broken' },
		{ source: 1, target: 2, type: 'inefficient' },
		{ source: 2, target: 3, type: 'broken' },
		{ source: 0, target: 4, type: 'inefficient' },
		{ source: 4, target: 5, type: 'broken' },
		{ source: 5, target: 6, type: 'inefficient' },
		{ source: 3, target: 7, type: 'broken' },
		{ source: 6, target: 7, type: 'inefficient' },
		{ source: 1, target: 5, type: 'broken' }
	];
</script>

<section
	class="fragmentation-section"
	aria-labelledby="fragmentation-heading"
	bind:this={sectionRef}
>
	<div class="vector-container">
		<div class="section-header reveal-up" class:is-visible={isVisible}>
			<h2 id="fragmentation-heading">The enemy of growth is fragmentation.</h2>
			<p class="section-desc">
				You don't need another software to learn, another agency to coordinate, or master any tools
				or prompts. Vector handles the complexity so you can only focus on growth.
			</p>
		</div>

		<div
			class="chaos-visual reveal-up"
			class:is-visible={isVisible}
			style="transition-delay: 150ms;"
		>
			<svg viewBox="0 0 550 210" preserveAspectRatio="xMidYMid meet" class="chaos-graph">
				{#each edges as edge, i (i)}
					{@const s = nodes[edge.source]}
					{@const t = nodes[edge.target]}
					<path
						d="M {s.x} {s.y} L {t.x} {t.y}"
						fill="none"
						stroke={edge.type === 'broken' ? RED : AMBER}
						stroke-width={edge.type === 'broken' ? '1.5' : '1.2'}
						stroke-dasharray={edge.type === 'broken' ? '4 6' : 'none'}
						class="chaos-edge"
						class:broken={edge.type === 'broken'}
					/>
				{/each}

				{#each nodes as node (node.id)}
					<g class="chaos-node">
						<!-- Soft outer ring -->
						<circle
							cx={node.x}
							cy={node.y}
							r="13"
							fill="none"
							stroke={node.color}
							stroke-width="1"
							opacity="0.28"
						/>

						<!-- Pulse via SMIL opacity only (no CSS transform on SVG = no square boxes) -->
						<circle
							cx={node.x}
							cy={node.y}
							r="10"
							fill="none"
							stroke={node.color}
							stroke-width="1"
							opacity="0"
						>
							{#if isVisible}
								<animate
									attributeName="opacity"
									values="0.45;0;0.45"
									dur="2.8s"
									begin="{node.delay}s"
									repeatCount="indefinite"
								/>
							{/if}
						</circle>

						<!-- Gentle vertical float via SMIL on the core only -->
						<circle cx={node.x} cy={node.y} r="5" fill={node.color}>
							{#if isVisible}
								<animate
									attributeName="cy"
									values="{node.y};{node.y - 3};{node.y}"
									dur="4s"
									begin="{node.delay}s"
									repeatCount="indefinite"
								/>
							{/if}
						</circle>

						{#if node.warn}
							<circle cx={node.x + 7} cy={node.y - 7} r="2.75" fill={RED}>
								{#if isVisible}
									<animate
										attributeName="cy"
										values="{node.y - 7};{node.y - 10};{node.y - 7}"
										dur="4s"
										begin="{node.delay}s"
										repeatCount="indefinite"
									/>
								{/if}
							</circle>
						{/if}

						<text x={node.x} y={node.y + 24} text-anchor="middle" class="node-label">
							{node.label}
						</text>
					</g>
				{/each}
			</svg>
		</div>
	</div>
</section>

<style>
	.fragmentation-section {
		padding-block: clamp(48px, 6vw, 88px);
		background-color: var(--bg-1);
		border-top: 1px solid var(--border-subtle);
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-header {
		text-align: center;
		max-width: 640px;
		margin: 0 auto var(--space-32);
	}

	.section-header h2 {
		margin-bottom: var(--space-16);
		color: var(--vector-white);
	}

	.section-desc {
		font-size: 16px;
		color: var(--text-secondary);
	}

	.chaos-visual {
		max-width: 720px;
		margin: 0 auto;
	}

	.chaos-graph {
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.chaos-edge {
		opacity: 0.55;
		pointer-events: none;
	}

	.chaos-edge.broken {
		animation: dash-flow 12s linear infinite;
	}

	.node-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		fill: var(--text-tertiary);
		letter-spacing: 0.06em;
		pointer-events: none;
	}

	@keyframes dash-flow {
		to {
			stroke-dashoffset: -120;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chaos-edge.broken {
			animation: none;
		}

		.chaos-graph :global(animate) {
			display: none;
		}
	}

	@media (max-width: 767px) {
		.fragmentation-section {
			padding-block: var(--space-32);
		}
		.section-header {
			margin-bottom: var(--space-24);
		}
	}
</style>
