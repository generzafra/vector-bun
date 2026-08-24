<script lang="ts">
	import { onMount } from 'svelte';

	let isVisible = $state(false);
	let sectionRef: HTMLElement;

	// Form state
	let email = $state('');
	let domain = $state('');
	let goal = $state('general');
	let status = $state<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
	let errorMessage = $state('');

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					isVisible = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);

		if (sectionRef) {
			observer.observe(sectionRef);
		}

		return () => observer.disconnect();
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!email || !email.includes('@')) {
			status = 'error';
			errorMessage = 'Please enter a valid work email address.';
			return;
		}

		if (!domain || domain.trim().length < 3) {
			status = 'error';
			errorMessage = 'Please enter your company website domain.';
			return;
		}

		status = 'submitting';
		errorMessage = '';

		// Simulate brief API request / client audit queue
		try {
			await new Promise((resolve) => setTimeout(resolve, 800));
			status = 'submitted';
		} catch (err) {
			status = 'error';
			errorMessage = 'An error occurred. Please try again or sign in to Control.';
		}
	}
</script>

<section id="get-started" class="lead-section" bind:this={sectionRef}>
	<div class="ambient-glow lead-glow"></div>
	<div class="vector-container relative-content">
		<div class="lead-card vector-card reveal-up" class:is-visible={isVisible}>
			<div class="lead-header">
				<p class="eyebrow">READY TO GROW?</p>
				<h2>Request your growth audit</h2>
				<p class="lead-desc">
					Get a comprehensive evaluation of your digital acquisition footprint, search visibility,
					and conversion bottlenecks.
				</p>
			</div>

			{#if status === 'submitted'}
				<div class="success-box">
					<div class="success-icon" aria-hidden="true">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--vector-mint)"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M22 11.08V12a10 10 10 0 1 1-5.93-9.14"></path>
							<polyline points="22 4 12 14.01 9 11.01"></polyline>
						</svg>
					</div>
					<h3>Audit request received!</h3>
					<p>
						Thank you! Our growth engine is evaluating <strong>{domain}</strong>. We'll send your
						tailored analysis to <strong>{email}</strong> shortly.
					</p>
					<a href="/login" class="vector-btn vector-btn-primary">Sign in to Workspace</a>
				</div>
			{:else}
				<form class="lead-form" onsubmit={handleSubmit}>
					{#if status === 'error'}
						<div class="form-error" role="alert">
							{errorMessage}
						</div>
					{/if}

					<div class="form-grid">
						<div class="field">
							<label for="work-email">Work Email</label>
							<input
								id="work-email"
								type="email"
								placeholder="you@company.com"
								required
								bind:value={email}
								disabled={status === 'submitting'}
							/>
						</div>

						<div class="field">
							<label for="company-domain">Company Website</label>
							<input
								id="company-domain"
								type="text"
								placeholder="company.com"
								required
								bind:value={domain}
								disabled={status === 'submitting'}
							/>
						</div>

						<div class="field field-full">
							<label for="growth-goal">Primary Growth Focus</label>
							<select id="growth-goal" bind:value={goal} disabled={status === 'submitting'}>
								<option value="general">Comprehensive Customer Acquisition</option>
								<option value="funnels">Landing Pages & Funnel Conversion</option>
								<option value="seo">SEO, AEO & Generative AI Search (GEO)</option>
								<option value="content">Content & Organic Presence</option>
								<option value="analytics">Revenue Attribution & Analytics</option>
							</select>
						</div>
					</div>

					<button
						type="submit"
						class="vector-btn vector-btn-primary submit-btn"
						disabled={status === 'submitting'}
					>
						{status === 'submitting' ? 'Evaluating domain...' : 'Request Growth Audit'}
					</button>

					<p class="form-privacy">
						By submitting, you agree to Vector's terms. No spam. Unsubscribe anytime.
					</p>
				</form>
			{/if}
		</div>
	</div>
</section>

<style>
	.lead-section {
		position: relative;
		padding-block: var(--section-padding-y, clamp(64px, 8vw, 120px));
		background-color: var(--vector-black);
		overflow: hidden;
	}

	.lead-glow {
		width: 900px;
		height: 900px;
		background: radial-gradient(circle at 50% 50%, rgba(22, 119, 255, 0.08) 0%, transparent 65%);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.relative-content {
		position: relative;
		z-index: 10;
	}

	.lead-card {
		width: 100%;
		max-width: 760px;
		margin: 0 auto;
		padding: clamp(32px, 6vw, 56px);
		border: 1px solid rgba(53, 217, 255, 0.25);
		background: linear-gradient(180deg, rgba(20, 24, 33, 0.95) 0%, rgba(12, 14, 20, 0.95) 100%);
		box-shadow: 0 32px 64px rgba(0, 0, 0, 0.6);
		box-sizing: border-box;
	}

	.lead-header {
		text-align: center;
		margin-bottom: var(--space-40);
	}

	.eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--vector-cyan);
		margin-bottom: var(--space-8);
	}

	.lead-header h2 {
		color: var(--vector-white);
		margin-bottom: var(--space-16);
	}

	.lead-desc {
		font-size: 16px;
		color: var(--text-secondary);
		max-width: 580px;
		margin: 0 auto;
	}

	.lead-form {
		width: 100%;
		max-width: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-24);
		box-sizing: border-box;
	}

	.form-error {
		padding: var(--space-12) var(--space-16);
		background: rgba(255, 77, 77, 0.1);
		border: 1px solid rgba(255, 77, 77, 0.3);
		border-radius: var(--radius-sm);
		color: #ff6b6b;
		font-size: 14px;
	}

	.form-grid {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-20);
		box-sizing: border-box;
	}

	.field-full {
		grid-column: span 2;
	}

	.field {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 8px;
		box-sizing: border-box;
	}

	.field label {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.field input,
	.field select {
		width: 100%;
		height: 48px;
		padding: 0 16px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-btn);
		color: var(--vector-white);
		font-family: var(--font-primary);
		font-size: 15px;
		outline: none;
		box-sizing: border-box;
		transition:
			border-color 150ms var(--ease-standard),
			box-shadow 150ms var(--ease-standard);
	}

	.field input:focus,
	.field select:focus {
		border-color: var(--vector-cyan);
		box-shadow: 0 0 12px rgba(53, 217, 255, 0.2);
	}

	.field select option {
		background: #111;
		color: var(--vector-white);
	}

	.submit-btn {
		width: 100%;
		height: 52px;
		font-size: 16px;
		font-weight: 600;
	}

	.form-privacy {
		font-size: 12px;
		color: var(--text-tertiary);
		text-align: center;
	}

	.success-box {
		text-align: center;
		padding: var(--space-24) 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-16);
	}

	.success-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(50, 230, 161, 0.1);
		border-radius: 50%;
	}

	.success-icon svg {
		width: 28px;
		height: 28px;
	}

	.success-box h3 {
		font-size: 24px;
		color: var(--vector-white);
	}

	.success-box p {
		font-size: 15px;
		color: var(--text-secondary);
		max-width: 480px;
	}

	@media (max-width: 767px) {
		.lead-section {
			padding-block: var(--space-48);
		}

		.form-grid {
			grid-template-columns: 1fr;
		}

		.field-full {
			grid-column: span 1;
		}
	}
</style>
