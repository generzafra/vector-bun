<script lang="ts">
	let {
		cx,
		cy,
		label = '',
		state = 'idle',
		delay = 0,
		visible = false,
		align = 'right'
	}: {
		cx: number;
		cy: number;
		label?: string;
		state?: 'idle' | 'detected' | 'active' | 'processing' | 'selected' | 'muted' | 'error';
		delay?: number;
		visible?: boolean;
		align?: 'left' | 'right' | 'center';
	} = $props();

	// Colors based on state
	let color = $derived(
		state === 'error'
			? 'var(--vector-red)'
			: state === 'processing' || state === 'detected'
				? 'var(--vector-cyan)'
				: state === 'muted'
					? 'var(--vector-steel)'
					: 'var(--vector-blue)'
	);

	let radius = $derived(state === 'active' || state === 'processing' ? 5 : 4);

	let labelX = $derived(align === 'right' ? cx + 16 : align === 'left' ? cx - 16 : cx);
	let labelY = $derived(align === 'center' ? cy + 24 : cy + 4);
	let textAnchor = $derived(align === 'right' ? 'start' : align === 'left' ? 'end' : 'middle');
</script>

<g class="signal-node" class:visible style="--delay: {delay}ms">
	{#if state === 'detected' || state === 'processing'}
		<circle {cx} {cy} r={radius + 4} fill="none" stroke={color} stroke-width="1" class="pulse" />
	{/if}

	<circle
		{cx}
		{cy}
		r={radius}
		fill={color}
		class="core-dot"
		class:glow={state === 'active' || state === 'processing'}
	/>

	{#if label}
		<text x={labelX} y={labelY} text-anchor={textAnchor} class="node-label">
			{label}
		</text>
	{/if}
</g>

<style>
	.signal-node {
		opacity: 0;
		transition: opacity 300ms var(--ease-enter);
		transition-delay: var(--delay);
	}

	.signal-node.visible {
		opacity: 1;
	}

	.core-dot {
		transition: all 300ms var(--ease-standard);
	}

	.glow {
		filter: drop-shadow(0 0 6px var(--cyan-glow));
	}

	.pulse {
		animation: pulse-anim 2s infinite cubic-bezier(0.2, 0.8, 0.2, 1);
		transform-origin: center;
		transform-box: fill-box;
	}

	.node-label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.05em;
		fill: var(--vector-steel);
		text-transform: uppercase;
	}

	@keyframes pulse-anim {
		0% {
			transform: scale(0.8);
			opacity: 0.8;
		}
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pulse {
			animation: none;
			opacity: 0.5;
		}
		.signal-node {
			transition: opacity 100ms linear;
		}
	}
</style>
