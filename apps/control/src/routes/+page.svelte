<script lang="ts">
	import LegalLinks from '$lib/vector/LegalLinks.svelte';
	import MarketingHomepage from '$lib/vector/marketing/MarketingHomepage.svelte';
	import '$lib/vector/marketing/marketing.css';
</script>

<svelte:head>
	<meta
		name="description"
		content="Vector builds and operates the customer-acquisition engine behind your company."
	/>
</svelte:head>

<div class="marketing-page">
	<a class="skip" href="#main">Skip to content</a>
	<header class="marketing-bar">
		<a class="brand" href="/">
			<img src="/brand/vector/logo/vector-wordmark.png" alt="Vector" />
		</a>
		<nav aria-label="Marketing">
			<a href="#how-it-works">How it works</a>
			<a href="#outcomes">Outcomes</a>
			<a href="#faq">FAQ</a>
			<a class="signin" href="/login">Sign in</a>
			<a class="vector-btn vector-btn-primary nav-cta" href="#get-started">Get Started</a>
		</nav>
	</header>
	<MarketingHomepage />
	<footer class="marketing-foot">
		<LegalLinks />
	</footer>
</div>
