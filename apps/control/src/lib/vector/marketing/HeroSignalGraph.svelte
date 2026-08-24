<script lang="ts">
	import { onMount } from 'svelte';
	import SignalNode from './SignalNode.svelte';
	import VectorPath from './VectorPath.svelte';
	import HeroOutcomeMetric from './HeroOutcomeMetric.svelte';

	let mounted = $state(false);
	let innerWidth = $state(1024);

	// Mobile detection for timing / density
	let isMobile = $derived(innerWidth < 768);

	// Phase timing
	let baseTiming = $derived(isMobile ? 0.75 : 1.0);
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
			const initialBase = window.innerWidth < 768 ? 0.75 : 1.0;
			setTimeout(() => (phase1 = true), 100 * initialBase);
			setTimeout(() => (phase2 = true), (100 + 400) * initialBase);
			setTimeout(() => (phase3 = true), (100 + 400 + 600) * initialBase);
			setTimeout(() => (phase4 = true), (100 + 400 + 600 + 400) * initialBase);
			setTimeout(() => (phase5 = true), (100 + 400 + 600 + 400 + 400) * initialBase);
		}
	});

	// Layout constants for vertical orientation
	const width = 540;
	const height = 500;

	// Center & top nodes in vertical layout
	const centerNode = { x: 270, y: 250 };
	const outcomeNode = { x: 270, y: 115 };

	// Source nodes along the bottom
	const desktopSources = [
		{ id: 'traffic', label: 'TRAFFIC', x: 45, y: 420 },
		{ id: 'seo', label: 'SEO', x: 135, y: 420 },
		{ id: 'ads', label: 'ADS', x: 225, y: 420 },
		{ id: 'content', label: 'CONTENT', x: 315, y: 420 },
		{ id: 'crm', label: 'CRM', x: 405, y: 420 },
		{ id: 'analytics', label: 'ANALYTICS', x: 495, y: 420 }
	];

	const mobileSources = [
		{ id: 'traffic', label: 'TRAFFIC', x: 75, y: 420 },
		{ id: 'seo', label: 'SEO', x: 205, y: 420 },
		{ id: 'content', label: 'CONTENT', x: 335, y: 420 },
		{ id: 'ads', label: 'ADS', x: 465, y: 420 }
	];

	let activeSources = $derived(isMobile ? mobileSources : desktopSources);

	// Generate vertical bezier path from bottom source up to center node
	function getUpwardPath(sx: number, sy: number, ex: number, ey: number) {
		const cy1 = sy - (sy - ey) * 0.55;
		const cx2 = ex + (sx - ex) * 0.15;
		const cy2 = ey + (sy - ey) * 0.3;
		return `M ${sx} ${sy} C ${sx} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
	}
</script>

<svelte:window bind:innerWidth />

<div class="graph-container">
	<!-- Outcome Metric Card at top center -->
	<div class="outcome-container">
		<HeroOutcomeMetric visible={phase5} delay={0} duration={700 * baseTiming} />
	</div>

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

		<!-- Upward Connections from Bottom Sources to Vector Mark (Phase 2) -->
		{#each activeSources as source, i (source.id)}
			<VectorPath
				d={getUpwardPath(source.x, source.y - 8, centerNode.x, centerNode.y + 32)}
				drawn={phase2}
				state={phase3 ? 'active' : 'idle'}
				delay={i * 50 * baseTiming}
				duration={600 * baseTiming}
				showPulse={phase5}
			/>
		{/each}

		<!-- Upward Direction Path from Vector Mark to Outcome Growth Card (Phase 4) -->
		<VectorPath
			d={`M ${centerNode.x} ${centerNode.y - 32} L ${outcomeNode.x} ${outcomeNode.y}`}
			drawn={phase4}
			state={phase5 ? 'success' : phase4 ? 'active' : 'idle'}
			delay={0}
			duration={400 * baseTiming}
			showPulse={phase5}
		/>

		<!-- Source Nodes along bottom (Phase 1) -->
		{#each activeSources as source, i (source.id)}
			<SignalNode
				cx={source.x}
				cy={source.y}
				label={source.label}
				align="center"
				visible={phase1}
				state={phase2 ? 'active' : 'detected'}
				delay={i * 50 * baseTiming}
			/>
		{/each}

		<!-- Intelligence Node with Vector Mark PNG Logo (Phase 3) -->
		<g class="intelligence-node" class:visible={phase3}>
			<!-- Official Vector Mark PNG -->
			<image
				href="/brand/vector/logo/vector-mark.png"
				x={centerNode.x - 24}
				y={centerNode.y - 24}
				width="48"
				height="48"
				filter="url(#glow-cyan)"
			/>
			<circle
				cx={centerNode.x}
				cy={centerNode.y}
				r="32"
				fill="none"
				stroke="var(--vector-cyan)"
				stroke-width="1"
				opacity="0.3"
				class="orbit"
			/>
			<circle
				cx={centerNode.x}
				cy={centerNode.y}
				r="44"
				fill="none"
				stroke="var(--vector-cyan)"
				stroke-width="1"
				opacity="0.1"
				class="orbit-reverse"
			/>
		</g>
	</svg>
</div>

<style>
	.graph-container {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 480px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.outcome-container {
		position: absolute;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
	}

	.signal-graph {
		width: 100%;
		height: 100%;
		max-width: 540px;
		overflow: visible;
	}

	.intelligence-node {
		opacity: 0;
		transform: scale(0.8);
		transform-origin: 270px 250px;
		transition: all 400ms var(--ease-enter);
	}

	.intelligence-node.visible {
		opacity: 1;
		transform: scale(1);
	}

	.orbit {
		animation: spin 10s linear infinite;
		transform-origin: 270px 250px;
		stroke-dasharray: 4 4;
	}

	.orbit-reverse {
		animation: spin-reverse 15s linear infinite;
		transform-origin: 270px 250px;
		stroke-dasharray: 2 6;
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
			min-height: 420px;
		}
	}
</style>
