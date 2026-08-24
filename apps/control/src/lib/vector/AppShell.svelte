<script lang="ts">
	import { page } from '$app/state';
	import LegalLinks from '$lib/vector/LegalLinks.svelte';

	let { userId, children }: { userId: string | null; children: import('svelte').Snippet } =
		$props();

	const links = [
		{ href: '/', label: 'Overview' },
		{ href: '/clients', label: 'Clients' },
		{ href: '/knowledge', label: 'Knowledge' },
		{ href: '/funnel', label: 'Funnel' },
		{ href: '/leads', label: 'Leads' },
		{ href: '/email', label: 'Email' },
		{ href: '/social', label: 'Social' },
		{ href: '/search', label: 'Search' },
		{ href: '/intelligence', label: 'Intelligence' },
		{ href: '/autonomy', label: 'Autonomy' },
		{ href: '/analytics', label: 'Analytics' },
		{ href: '/experiments', label: 'Experiments' },
		{ href: '/launch', label: 'Launch' },
		{ href: '/portfolio', label: 'Portfolio' },
		{ href: '/members', label: 'Members' }
	] as const;

	let navOpen = $state(false);
	const current = $derived(page.url.pathname);
	const signedOutDocument = $derived(!userId && (current === '/privacy' || current === '/terms'));

	function isActive(href: string) {
		return href === '/' ? current === '/' : current === href || current.startsWith(`${href}/`);
	}

	function closeNav() {
		navOpen = false;
	}
</script>

{#if userId}
	<div class={['app', navOpen && 'open']}>
		<a class="skip" href="#main">Skip to content</a>
		<aside class="sidebar">
			<a class="brand" href="/" onclick={closeNav}>
				<img src="/brand/vector/logo/vector-wordmark.png" alt="Vector" />
			</a>
			<nav aria-label="Control">
				{#each links as link (link.href)}
					<a
						href={link.href}
						aria-current={isActive(link.href) ? 'page' : undefined}
						onclick={closeNav}
					>
						{link.label}
					</a>
				{/each}
			</nav>
			<div class="sidebar-legal">
				<LegalLinks {current} />
			</div>
		</aside>
		<div class="frame">
			<header class="topbar">
				<button
					type="button"
					class="menu secondary"
					aria-expanded={navOpen}
					onclick={() => (navOpen = !navOpen)}
				>
					Menu
				</button>
				<p class="workspace">Control</p>
			</header>
			<main id="main" class="main">
				{@render children()}
			</main>
		</div>
		{#if navOpen}
			<button type="button" class="scrim" aria-label="Close navigation" onclick={closeNav}></button>
		{/if}
	</div>
{:else}
	<div class={['auth', signedOutDocument && 'document']}>
		<a class="brand" href="/login">
			<img src="/brand/vector/logo/vector-wordmark.png" alt="Vector" />
		</a>
		<main id="main" class="auth-main">
			{@render children()}
		</main>
		<LegalLinks {current} />
	</div>
{/if}

<style>
	.app,
	.auth {
		min-height: 100svh;
		background: var(--vector-surface-canvas);
	}

	.app {
		display: grid;
		grid-template-columns: var(--vector-sidebar) minmax(0, 1fr);
	}

	.skip {
		position: absolute;
		left: var(--vector-space-4);
		top: -3rem;
		z-index: 4;
		background: var(--vector-surface-raised);
		color: var(--vector-text-primary);
		padding: 0.6rem 0.9rem;
	}

	.skip:focus {
		top: var(--vector-space-4);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--vector-space-8);
		padding: var(--vector-space-5);
		border-right: 1px solid var(--vector-border);
		background: var(--bg-1);
	}

	.sidebar-legal {
		margin-top: auto;
		padding-top: var(--vector-space-4);
	}

	.brand {
		display: flex;
		align-items: center;
		text-decoration: none;
	}

	.brand img {
		display: block;
		height: 28px;
		width: auto;
	}

	nav {
		display: grid;
		gap: var(--vector-space-1);
	}

	nav a {
		display: block;
		padding: 0.55rem 0.7rem;
		border-radius: var(--vector-radius-sm);
		color: var(--text-secondary);
		text-decoration: none;
	}

	nav a:hover {
		color: var(--vector-text-primary);
		background: var(--surface-2);
	}

	nav a[aria-current='page'] {
		color: var(--vector-text-primary);
		background: color-mix(in srgb, var(--vector-action-primary) 16%, transparent);
		box-shadow: inset 2px 0 0 var(--vector-action-primary);
	}

	.frame {
		min-width: 0;
		display: grid;
		grid-template-rows: var(--vector-topbar) minmax(0, 1fr);
	}

	.topbar {
		display: flex;
		align-items: center;
		gap: var(--vector-space-3);
		padding: 0 var(--vector-space-6);
		border-bottom: 1px solid var(--vector-border);
		background: color-mix(in srgb, var(--bg-1) 88%, transparent);
	}

	.workspace {
		margin: 0;
		color: var(--text-tertiary);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.menu,
	.scrim {
		display: none;
	}

	.main {
		padding: var(--vector-space-8) clamp(16px, 3vw, 40px) var(--vector-space-12);
	}

	.auth {
		display: grid;
		align-content: center;
		justify-items: center;
		gap: var(--vector-space-8);
		padding: var(--vector-space-8);
	}

	.auth-main {
		width: min(100%, 28rem);
	}

	.auth.document {
		align-content: start;
	}

	.auth.document .auth-main {
		width: min(100%, 52rem);
	}

	@media (max-width: 860px) {
		.app {
			grid-template-columns: minmax(0, 1fr);
		}

		.sidebar {
			position: fixed;
			inset: 0 auto 0 0;
			z-index: 3;
			width: min(86vw, var(--vector-sidebar));
			transform: translateX(-100%);
			transition: transform var(--vector-panel-enter) var(--ease-standard);
		}

		.app.open .sidebar {
			transform: none;
		}

		.menu,
		.app.open .scrim {
			display: inline-flex;
		}

		.scrim {
			position: fixed;
			inset: 0;
			z-index: 2;
			border: 0;
			background: rgba(0, 0, 0, 0.45);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sidebar {
			transition: none;
		}
	}
</style>
