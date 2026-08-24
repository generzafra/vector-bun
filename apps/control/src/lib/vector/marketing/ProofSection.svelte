<section id="scan" class="proof-section">
	<div class="vector-container">
		<div class="proof-split">
			<div class="proof-copy">
				<h2>See the operating system, not another tool.</h2>
				<p class="section-desc">
					Control is where operators and clients run Vector. Delivery is the public site on the
					client's domain. Sign in to work in a tenant workspace. Vector does not invent a readiness
					score from a domain name.
				</p>
				<a class="vector-btn vector-btn-primary" href="/login">Sign in to Control</a>
			</div>
			<div class="proof-visual">
				<div class="vector-card mockup-card">
					<div class="mockup-header">
						<div class="mockup-title">Illustrative direction</div>
						<div class="mockup-note">Not a scored audit</div>
					</div>
					<div class="mockup-body">
						<p class="item-desc">
							Fragmented channels become one directed path: observed signals, approved execution,
							measurable outcomes.
						</p>
						<div class="comparison">
							<div class="comp-col">
								<span class="comp-label">Current</span>
								<div class="comp-box current"></div>
							</div>
							<div class="comp-arrow" aria-hidden="true">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="var(--vector-steel)"
									stroke-width="1.5"
								>
									<path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</div>
							<div class="comp-col">
								<span class="comp-label">Directed</span>
								<div class="comp-box direction">
									<div class="wire-btn"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.proof-section {
		padding: var(--space-96) 0;
		background-color: var(--bg-0);
	}

	.proof-split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-64);
		align-items: center;
	}

	.proof-copy h2 {
		color: var(--vector-white);
		margin-bottom: var(--space-24);
	}

	.section-desc {
		font-size: 17px;
		color: var(--text-secondary);
		margin-bottom: var(--space-40);
	}

	.mockup-card {
		padding: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.mockup-header {
		padding: var(--space-20) var(--space-24);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(0, 0, 0, 0.2);
		gap: var(--space-12);
	}

	.mockup-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--vector-white);
	}

	.mockup-note {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.mockup-body {
		padding: var(--space-24);
	}

	.item-desc {
		font-size: 14px;
		color: var(--text-secondary);
		margin-bottom: var(--space-24);
	}

	.comparison {
		display: flex;
		align-items: center;
		gap: var(--space-16);
	}

	.comp-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.comp-label {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-tertiary);
		text-transform: uppercase;
	}

	.comp-box {
		height: 120px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-1);
	}

	.comp-box.current {
		opacity: 0.7;
	}

	.comp-box.direction {
		border-color: rgba(53, 217, 255, 0.3);
		background: linear-gradient(180deg, rgba(53, 217, 255, 0.05) 0%, transparent 100%), var(--bg-1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.wire-btn {
		width: 60%;
		height: 24px;
		background: var(--vector-blue);
		border-radius: 4px;
		box-shadow: 0 0 10px var(--blue-glow);
	}

	.comp-arrow {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
	}

	@media (max-width: 1023px) {
		.proof-split {
			grid-template-columns: 1fr;
		}

		.proof-copy {
			text-align: center;
		}
	}

	@media (max-width: 767px) {
		.proof-section {
			padding: var(--space-64) 0;
		}

		.comparison {
			flex-direction: column;
		}

		.comp-arrow {
			transform: rotate(90deg);
		}

		.comp-box {
			height: 80px;
		}
	}
</style>
