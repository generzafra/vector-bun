<script lang="ts">
	// A subtle 40x40px technical grid at 3-8% opacity
	let {
		opacity = 0.06,
		fadeEdges = true
	}: {
		opacity?: number;
		fadeEdges?: boolean;
	} = $props();
</script>

<div class="vector-grid-container" class:fade-edges={fadeEdges}>
	<div class="vector-grid" style="--grid-opacity: {opacity}"></div>
</div>

<style>
	.vector-grid-container {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.fade-edges {
		mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
		-webkit-mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
	}

	.vector-grid {
		position: absolute;
		inset: -50%;
		background-image:
			linear-gradient(rgba(93, 123, 154, var(--grid-opacity)) 1px, transparent 1px),
			linear-gradient(90deg, rgba(93, 123, 154, var(--grid-opacity)) 1px, transparent 1px);
		background-size: 40px 40px;
	}
</style>
