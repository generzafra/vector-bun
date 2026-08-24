<script lang="ts">
	import { onMount } from 'svelte';
	import SignalNode from './SignalNode.svelte';
	import VectorPath from './VectorPath.svelte';
	import HeroOutcomeMetric from './HeroOutcomeMetric.svelte';

	let mounted = $state(false);
	let innerWidth = $state(1024);

	// Mobile detection for simplified view
	let isMobile = $derived(innerWidth < 768);

	// Phase timing
	let baseTiming = $derived(isMobile ? 0.75 : 1.0); // 25% faster on mobile
	let tSignals = $derived(100 * baseTiming);
	let tConnections = $derived(tSignals + 400 * baseTiming);
	let tIntelligence = $derived(tConnections + 600 * baseTiming);
	let tDirection = $derived(tIntelligence + 400 * baseTiming);
	let tGrowth = $derived(tDirection + 400 * baseTiming);

	// State flags
	let phase1 = $state(false); // Signals
	let phase2 = $state(false); // Connections
	let phase3 = $state(false); // Intelligence
	let phase4 = $state(false); // Direction
	let phase5 = $state(false); // Growth

	onMount(() => {
		mounted = true;

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (prefersReducedMotion) {
			phase1 = phase2 = phase3 = phase4 = phase5 = true;
		} else {
			// We need to use reactive statements to trigger these if baseTiming changes,
			// but for simplicity, we'll just use the initial value on mount.
			const initialBase = window.innerWidth < 768 ? 0.75 : 1.0;
			setTimeout(() => (phase1 = true), 100 * initialBase);
			setTimeout(() => (phase2 = true), (100 + 400) * initialBase);
			setTimeout(() => (phase3 = true), (100 + 400 + 600) * initialBase);
			setTimeout(() => (phase4 = true), (100 + 400 + 600 + 400) * initialBase);
			setTimeout(() => (phase5 = true), (100 + 400 + 600 + 400 + 400) * initialBase);
		}
	});

	// Layout constants
	const width = 600;
	const height = 500;

	const sources = [
		{ id: 'traffic', label: 'TRAFFIC', y: 80 },
		{ id: 'seo', label: 'SEO', y: 140 },
		{ id: 'ads', label: 'ADS', y: 200 },
		{ id: 'content', label: 'CONTENT', y: 260 },
		{ id: 'crm', label: 'CRM', y: 320 },
		{ id: 'analytics', label: 'ANALYTICS', y: 380 }
	];

	const sourceX = 120;
	const centerNode = { x: 340, y: 230 };
	const outcomeNode = { x: 500, y: 230 };

	// Generate bezier paths from sources to center
	function getPath(sx: number, sy: number, ex: number, ey: number) {
		const cx1 = sx + (ex - sx) * 0.5;
		const cy1 = sy;
		const cx2 = sx + (ex - sx) * 0.5;
		const cy2 = ey;
		return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
	}

	let activeSources = $derived(
		isMobile
			? sources.filter((s) => ['traffic', 'content', 'crm', 'ads'].includes(s.id.toLowerCase()))
			: sources
	);
</script>

<svelte:window bind:innerWidth />

<div class="graph-container">
	<svg viewBox="0 0 {width} {height}" class="signal-graph" preserveAspectRatio="xMidYMid meet">
		<defs>
			<linearGradient id="vector-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--vector-blue)" />
				<stop offset="100%" stop-color="var(--vector-cyan)" />
			</linearGradient>

			<filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur stdDeviation="6" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>
		</defs>

		<!-- Connections (Phase 2) -->
		{#each activeSources as source, i (source.id)}
			<VectorPath
				d={getPath(sourceX, source.y, centerNode.x - 15, centerNode.y)}
				drawn={phase2}
				state={phase3 ? 'active' : 'idle'}
				delay={i * 50 * baseTiming}
				duration={600 * baseTiming}
				showPulse={phase5}
			/>
		{/each}

		<!-- Direction Path (Phase 4) -->
		<VectorPath
			d={`M ${centerNode.x + 15} ${centerNode.y} L ${outcomeNode.x - 20} ${outcomeNode.y}`}
			drawn={phase4}
			state={phase5 ? 'success' : phase4 ? 'active' : 'idle'}
			delay={0}
			duration={400 * baseTiming}
			showPulse={phase5}
		/>

		<!-- Source Nodes (Phase 1) -->
		{#each activeSources as source, i (source.id)}
			<SignalNode
				cx={sourceX}
				cy={source.y}
				label={source.label}
				align="left"
				visible={phase1}
				state={phase2 ? 'active' : 'detected'}
				delay={i * 50 * baseTiming}
			/>
		{/each}

		<!-- Intelligence Node (Phase 3) -->
		<g class="intelligence-node" class:visible={phase3}>
			<!-- Vector Mark simplified -->
			<path
				d="M {centerNode.x - 12} {centerNode.y - 15} L {centerNode.x} {centerNode.y +
					10} L {centerNode.x + 12} {centerNode.y - 15}"
				fill="none"
				stroke="url(#vector-grad)"
				stroke-width="3"
				stroke-linejoin="round"
				stroke-linecap="round"
				filter="url(#glow-cyan)"
			/>
			<circle
				cx={centerNode.x}
				cy={centerNode.y}
				r="25"
				fill="none"
				stroke="var(--vector-cyan)"
				stroke-width="1"
				opacity="0.3"
				class="orbit"
			/>
			<circle
				cx={centerNode.x}
				cy={centerNode.y}
				r="35"
				fill="none"
				stroke="var(--vector-cyan)"
				stroke-width="1"
				opacity="0.1"
				class="orbit-reverse"
			/>
		</g>
	</svg>

	<!-- Outcome Metric (Phase 5) -->
	<div class="outcome-container" style="left: {outcomeNode.x}px; top: {outcomeNode.y - 50}px;">
		<HeroOutcomeMetric visible={phase5} delay={0} duration={700 * baseTiming} />
	</div>
</div>

<style>
	.graph-container {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.signal-graph {
		width: 100%;
		height: 100%;
		max-width: 600px;
		overflow: visible;
	}

	.intelligence-node {
		opacity: 0;
		transform: scale(0.8);
		transform-origin: 340px 230px;
		transition: all 400ms var(--ease-enter);
	}

	.intelligence-node.visible {
		opacity: 1;
		transform: scale(1);
	}

	.orbit {
		animation: spin 10s linear infinite;
		transform-origin: 340px 230px;
		stroke-dasharray: 4 4;
	}

	.orbit-reverse {
		animation: spin-reverse 15s linear infinite;
		transform-origin: 340px 230px;
		stroke-dasharray: 2 6;
	}

	.outcome-container {
		position: absolute;
		transform: translateY(-50%);
	}

	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes spin-reverse {
		100% {
			transform: rotate(-360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.orbit,
		.orbit-reverse {
			animation: none;
		}
		.intelligence-node {
			transition: opacity 100ms linear;
			transform: none;
		}
		.intelligence-node.visible {
			opacity: 1;
		}
	}

	@media (max-width: 767px) {
		.graph-container {
			min-height: 300px;
		}
		.outcome-container {
			/* Adjust position for mobile scaling */
			left: auto !important;
			right: 5%;
		}
	}
</style>
