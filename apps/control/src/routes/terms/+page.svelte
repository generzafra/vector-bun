<script lang="ts">
	import LegalDocument from '$lib/vector/LegalDocument.svelte';

	let { data } = $props();
</script>

<LegalDocument document={data.document} relatedHref="/privacy" relatedLabel="Privacy Policy" />
