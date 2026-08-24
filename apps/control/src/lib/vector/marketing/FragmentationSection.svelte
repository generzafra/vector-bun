<script lang="ts">
	import { onMount } from 'svelte';

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	// Generate random chaotic paths
	const nodes = [
		{ x: 100, y: 80, label: 'WEB DEV', color: 'var(--vector-amber)' },
		{ x: 250, y: 50, label: 'SEO', color: 'var(--vector-steel)' },
		{ x: 400, y: 120, label: 'SOCIAL', color: 'var(--vector-red)' },
		{ x: 150, y: 200, label: 'EMAIL', color: 'var(--vector-steel)' },
		{ x: 300, y: 250, label: 'ANALYTICS', color: 'var(--vector-amber)' },
		{ x: 450, y: 220, label: 'ADS', color: 'var(--vector-red)' },
		{ x: 200, y: 320, label: 'CRM', color: 'var(--vector-steel)' },
		{ x: 380, y: 350, label: 'CONTENT', color: 'var(--vector-amber)' }
	];

	const edges = [
		{ source: 0, target: 1, type: 'broken' },
		{ source: 1, target: 2, type: 'inefficient' },
		{ source: 0, target: 3, type: 'inefficient' },
		{ source: 3, target: 4, type: 'broken' },
		{ source: 2, target: 5, type: 'inefficient' },
		{ source: 4, target: 6, type: 'broken' },
		{ source: 5, target: 7, type: 'inefficient' },
		{ source: 6, target: 7, type: 'broken' }
	];
</script>

<section class="fragmentation-section" aria-labelledby="fragmentation-heading">
	<div class="vector-container">
		<div class="section-header">
			<h2 id="fragmentation-heading">The enemy of growth is fragmentation.</h2>
			<p class="section-desc">
				You don't need another software tool to learn, and you shouldn't have to coordinate a web
				developer, SEO contractor, social media manager, and fragmented analytics tools.
			</p>
		</div>

		<div class="chaos-visual" class:visible={mounted}>
			<svg viewBox="0 0 550 400" preserveAspectRatio="xMidYMid meet" class="chaos-graph">
				<!-- Edges -->
				{#each edges as edge, i (i)}
					{@const s = nodes[edge.source]}
					{@const t = nodes[edge.target]}
					<path
						d="M {s.x} {s.y} L {t.x} {t.y}"
						fill="none"
						stroke={edge.type === 'broken' ? 'var(--vector-red)' : 'var(--vector-amber)'}
						stroke-width="1.5"
						stroke-dasharray={edge.type === 'broken' ? '4 8' : 'none'}
						class="chaos-edge"
						class:broken={edge.type === 'broken'}
					/>
				{/each}

				<!-- Nodes -->
				{#each nodes as node (node.label)}
					<g class="chaos-node">
						<circle cx={node.x} cy={node.y} r="6" fill={node.color} />
						<circle
							cx={node.x}
							cy={node.y}
							r="12"
							fill="none"
							stroke={node.color}
							stroke-width="1"
							opacity="0.3"
						/>
						<text x={node.x} y={node.y + 24} text-anchor="middle" class="node-label"
							>{node.label}</text
						>
					</g>
				{/each}
			</svg>
		</div>
	</div>
</section>

<style>
	.fragmentation-section {
		padding: var(--space-96) 0;
		background-color: var(--bg-1);
		border-top: 1px solid var(--border-subtle);
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-header {
		text-align: center;
		max-width: 640px;
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

	.chaos-visual {
		max-width: 800px;
		margin: 0 auto;
		opacity: 0;
		transform: translateY(20px);
		transition: all 800ms var(--ease-enter);
	}

	.chaos-visual.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.chaos-graph {
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.chaos-edge {
		opacity: 0.6;
	}

	.chaos-edge.broken {
		animation: dash-flow 20s linear infinite;
	}

	.node-label {
		font-family: var(--font-mono);
		font-size: 10px;
		fill: var(--text-tertiary);
		letter-spacing: 0.05em;
	}

	@keyframes dash-flow {
		to {
			stroke-dashoffset: -200;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chaos-visual {
			transition: opacity 100ms linear;
			transform: none;
		}
		.chaos-edge.broken {
			animation: none;
		}
	}

	@media (max-width: 767px) {
		.fragmentation-section {
			padding: var(--space-64) 0;
		}
		.section-header {
			margin-bottom: var(--space-40);
		}
	}
</style>
