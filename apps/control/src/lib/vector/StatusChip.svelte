<script lang="ts">
	let {
		label,
		tone = 'muted'
	}: {
		label: string;
		tone?: 'active' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
	} = $props();
</script>

<span class="chip" data-tone={tone}>{label}</span>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		min-height: 22px;
		padding: 0 0.55rem;
		border-radius: 999px;
		border: 1px solid var(--border-default);
		background: var(--surface-2);
		color: var(--text-secondary);
		font-size: 11px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.chip[data-tone='active'],
	.chip[data-tone='info'] {
		color: var(--vector-signal);
		border-color: color-mix(in srgb, var(--vector-signal) 35%, transparent);
	}

	.chip[data-tone='success'] {
		color: var(--vector-outcome-positive);
		border-color: color-mix(in srgb, var(--vector-outcome-positive) 35%, transparent);
	}

	.chip[data-tone='warning'] {
		color: var(--vector-risk-warning);
	}

	.chip[data-tone='danger'] {
		color: var(--vector-risk-danger);
	}
</style>
