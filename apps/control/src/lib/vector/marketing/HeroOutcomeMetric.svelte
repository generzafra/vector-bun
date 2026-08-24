<script lang="ts">
	let {
		label = 'EXPONENTIAL',
		value = 'GROWTH',
		visible = false,
		delay = 0,
		duration = 700
	}: {
		label?: string;
		value?: string;
		visible?: boolean;
		delay?: number;
		duration?: number;
	} = $props();
</script>

<div class="outcome-card" class:visible style="--delay: {delay}ms; --duration: {duration}ms">
	<div class="outcome-label">{label}</div>
	<div class="outcome-value">{value}</div>
	<div class="mini-chart" aria-hidden="true">
		<svg viewBox="0 0 100 30" preserveAspectRatio="none">
			<path
				d="M0,25 L20,22 L40,26 L60,15 L80,18 L100,5"
				fill="none"
				stroke="var(--vector-mint)"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="chart-line"
				class:drawn={visible}
			/>
			<circle
				cx="100"
				cy="5"
				r="3"
				fill="var(--vector-mint)"
				class="chart-dot"
				class:drawn={visible}
			/>
		</svg>
	</div>
</div>

<style>
	.outcome-card {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%),
			var(--vector-graphite);
		border: 1px solid rgba(50, 230, 161, 0.2);
		border-radius: var(--radius-card);
		padding: var(--space-20) var(--space-24);
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		opacity: 0;
		transform: translateY(10px);
		transition: all 500ms var(--ease-enter);
		transition-delay: var(--delay);
		min-width: 180px;
	}

	.outcome-card.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.outcome-label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.05em;
		color: var(--vector-steel);
		margin-bottom: var(--space-8);
	}

	.outcome-value {
		font-family: var(--font-display);
		font-size: 32px;
		font-weight: 600;
		color: var(--vector-mint);
		line-height: 1;
		margin-bottom: var(--space-16);
		text-shadow: 0 0 12px var(--mint-glow);
	}

	.mini-chart {
		height: 30px;
		width: 100%;
	}

	.mini-chart svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.chart-line {
		stroke-dasharray: 120;
		stroke-dashoffset: 120;
		transition: stroke-dashoffset var(--duration, 700ms) var(--ease-enter);
		transition-delay: calc(var(--delay) + 200ms);
	}

	.chart-line.drawn {
		stroke-dashoffset: 0;
	}

	.chart-dot {
		opacity: 0;
		transform: scale(0);
		transform-origin: 100px 5px;
		transition: all 300ms var(--ease-enter);
		transition-delay: calc(var(--delay) + 800ms);
	}

	.chart-dot.drawn {
		opacity: 1;
		transform: scale(1);
	}

	@media (prefers-reduced-motion: reduce) {
		.outcome-card {
			transition: opacity 100ms linear;
			transform: none;
		}
		.chart-line {
			transition: opacity 100ms linear;
			stroke-dasharray: none;
			stroke-dashoffset: 0;
			opacity: 0;
		}
		.chart-line.drawn {
			opacity: 1;
		}
		.chart-dot {
			transition: opacity 100ms linear;
			transform: none;
			opacity: 0;
		}
		.chart-dot.drawn {
			opacity: 1;
		}
	}
</style>
