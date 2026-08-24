<script lang="ts">
	import LegalDocument from '$lib/vector/LegalDocument.svelte';

	let { data } = $props();
</script>

<LegalDocument document={data.document} relatedHref="/terms" relatedLabel="Terms of Use" />
