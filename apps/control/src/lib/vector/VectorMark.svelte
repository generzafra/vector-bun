<script lang="ts">
	let { size = 28 }: { size?: number } = $props();
</script>

<svg class="mark" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Vector">
	<title>Vector</title>
	<path class="field" d="M6 22 L16 7 L26 22" />
	<path class="arrow" d="M16 11 L16 25" />
	<path class="arrow" d="M12 21 L16 25 L20 21" />
	<circle class="signal" cx="6" cy="22" r="1.6" />
	<circle class="signal" cx="26" cy="22" r="1.6" />
	<circle class="outcome" cx="16" cy="7" r="1.8" />
</svg>

<style>
	.mark {
		display: block;
		flex-shrink: 0;
	}

	.field,
	.arrow {
		fill: none;
		stroke: var(--vector-action-primary);
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.signal {
		fill: var(--vector-signal);
	}

	.outcome {
		fill: var(--vector-action-primary);
	}
</style>
