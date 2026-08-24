<script lang="ts">
	let {
		d,
		state = 'idle',
		delay = 0,
		duration = 600,
		drawn = false,
		showPulse = false
	}: {
		d: string;
		state?: 'idle' | 'active' | 'success' | 'error';
		delay?: number;
		duration?: number;
		drawn?: boolean;
		showPulse?: boolean;
	} = $props();

	// Colors based on state
	let color = $derived(
		state === 'error'
			? 'var(--vector-red)'
			: state === 'success'
				? 'var(--vector-mint)'
				: state === 'active'
					? 'var(--vector-cyan)'
					: 'var(--vector-steel)'
	);

	let strokeWidth = $derived(state === 'active' || state === 'success' ? 1.5 : 1);
	let opacity = $derived(state === 'idle' ? 0.3 : 0.8);
</script>

<g class="vector-path-group">
	<!-- Base path (faint, always drawn if we want a track, but here we animate the main path) -->

	<!-- Main animated path -->
	<path
		{d}
		fill="none"
		stroke={color}
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		class="main-path"
		class:drawn
		style="--delay: {delay}ms; --duration: {duration}ms; opacity: {opacity};"
		pathLength="100"
	/>

	<!-- Traveling pulse -->
	{#if showPulse && drawn && state === 'active'}
		<path
			{d}
			fill="none"
			stroke="var(--vector-cyan)"
			stroke-width="2"
			stroke-linecap="round"
			class="traveling-pulse"
			pathLength="100"
		/>
	{/if}
</g>

<style>
	.main-path {
		stroke-dasharray: 100;
		stroke-dashoffset: 100;
		transition:
			stroke-dashoffset var(--duration) var(--ease-enter) var(--delay),
			stroke var(--duration) var(--ease-standard),
			opacity var(--duration) var(--ease-standard);
	}

	.main-path.drawn {
		stroke-dashoffset: 0;
	}

	.traveling-pulse {
		stroke-dasharray: 10 90;
		stroke-dashoffset: 100;
		animation: travel 3s linear infinite;
		filter: drop-shadow(0 0 4px var(--cyan-glow));
	}

	@keyframes travel {
		0% {
			stroke-dashoffset: 100;
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			stroke-dashoffset: -10;
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.main-path {
			transition: opacity 100ms linear;
			stroke-dasharray: none;
			stroke-dashoffset: 0;
			opacity: 0;
		}
		.main-path.drawn {
			opacity: var(--opacity, 0.8);
		}
		.traveling-pulse {
			display: none;
		}
	}
</style>
