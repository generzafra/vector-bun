import { expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import {
	brands,
	claims,
	clearSeedClientActivity,
	clientGoals,
	clients,
	contacts,
	db,
	emailDomains,
	emailSuppressions,
	emailSequenceSteps,
	emailSequences,
	funnels,
	leads,
	offers,
	pageVersions,
	pages,
	services
} from '@vector/db';

test('clearing seed activity keeps the sample and removes test leftovers', async () => {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	const [brand] = await db.select().from(brands).where(eq(brands.clientId, alpha.id)).limit(1);
	expect(brand?.displayName).toBe('Client Alpha Dental');

	const [welcome] = await db
		.select()
		.from(emailSequences)
		.where(and(eq(emailSequences.clientId, alpha.id), eq(emailSequences.key, 'welcome_v1')))
		.limit(1);
	if (!welcome) throw new Error('Welcome sequence is missing. Run bun run db:seed.');
	const welcomeSteps = await db
		.select()
		.from(emailSequenceSteps)
		.where(eq(emailSequenceSteps.sequenceId, welcome.id));
	expect(welcomeSteps.map((step) => step.stepIndex).sort()).toEqual([0, 1]);

	const [leadFunnel] = await db
		.select()
		.from(funnels)
		.where(and(eq(funnels.clientId, alpha.id), eq(funnels.slug, 'lead')))
		.limit(1);
	if (!leadFunnel) throw new Error('Lead funnel is missing. Run bun run db:seed.');
	const [home] = await db
		.select()
		.from(pages)
		.where(
			and(eq(pages.clientId, alpha.id), eq(pages.funnelId, leadFunnel.id), eq(pages.path, '/'))
		)
		.limit(1);
	if (!home?.publishedVersionId)
		throw new Error('Published preview is missing. Run bun run db:seed.');
	const [published] = await db
		.select()
		.from(pageVersions)
		.where(eq(pageVersions.id, home.publishedVersionId))
		.limit(1);
	if (!published) throw new Error('Published page version is missing.');

	const suffix = crypto.randomUUID().slice(0, 8);
	const [contact] = await db
		.insert(contacts)
		.values({
			organizationId: alpha.organizationId,
			clientId: alpha.id,
			displayName: 'Activity Lead',
			email: `activity-${suffix}@alpha.test`
		})
		.returning();
	if (!contact) throw new Error('Contact was not inserted');
	await db.insert(leads).values({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		contactId: contact.id,
		hostname: 'alpha.localhost',
		domainKind: 'preview',
		isTest: true
	});
	await db.insert(clientGoals).values({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		name: 'Test consult goal',
		goalType: 'qualified_leads',
		targetValue: 4,
		unit: 'leads',
		period: 'month'
	});
	await db.insert(emailDomains).values({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		domain: `mail-${suffix}.alpha.test`,
		fromAddress: `hello@mail-${suffix}.alpha.test`,
		fromName: 'Client Alpha Dental'
	});
	const [extraSequence] = await db
		.insert(emailSequences)
		.values({
			organizationId: alpha.organizationId,
			clientId: alpha.id,
			key: `nurture_${suffix}`,
			name: 'Test nurture',
			status: 'draft'
		})
		.returning();
	if (!extraSequence) throw new Error('Extra sequence was not inserted');
	await db.insert(emailSequenceSteps).values({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		sequenceId: extraSequence.id,
		stepIndex: 0,
		subject: 'Test follow up',
		textBody: 'This step is test activity.',
		htmlBody: '<p>This step is test activity.</p>'
	});
	await db.insert(services).values({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		name: 'Test whitening',
		slug: `whitening-${suffix}`,
		outcome: 'A brighter smile',
		summary: 'Test-only service.'
	});
	await db.insert(offers).values({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		name: 'Test whitening package',
		summary: 'Test-only offer.',
		startingPriceMinor: 1000,
		currency: 'USD'
	});
	await db.insert(claims).values({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		kind: 'approved',
		statement: `Test claim ${suffix}`
	});
	await db.insert(pageVersions).values({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		pageId: home.id,
		version: published.version + 1000,
		status: 'draft',
		document: published.document
	});
	const sharedComplaint = `shared-${crypto.randomUUID()}@example.test`;
	const keptComplaint = `patient-${suffix}@clinic.example`;
	await db.insert(emailSuppressions).values([
		{
			email: sharedComplaint,
			scope: 'global',
			reason: 'complaint',
			source: 'provider_webhook'
		},
		{
			email: keptComplaint,
			scope: 'global',
			reason: 'complaint',
			source: 'provider_webhook'
		}
	]);

	let result: Awaited<ReturnType<typeof clearSeedClientActivity>>;
	try {
		result = await clearSeedClientActivity();
		expect(result.slugs).toEqual(['alpha', 'beta']);
		expect(result.deleted.leads).toBeGreaterThan(0);
		expect(result.deleted.contacts).toBeGreaterThan(0);
		expect(result.deleted.client_goals).toBeGreaterThan(0);
		expect(result.deleted.email_domains).toBeGreaterThan(0);
		expect(result.deleted.email_sequences).toBeGreaterThan(0);
		expect(result.deleted.page_versions).toBeGreaterThan(0);
		expect(result.deleted.services).toBeGreaterThan(0);
		expect(result.deleted.offers).toBeGreaterThan(0);
		expect(result.deleted.claims).toBeGreaterThan(0);
		expect(result.deleted.email_suppressions).toBeGreaterThan(0);

		const leadsAfter = await db.select().from(leads).where(eq(leads.clientId, alpha.id));
		const goalsAfter = await db
			.select()
			.from(clientGoals)
			.where(eq(clientGoals.clientId, alpha.id));
		const domainsAfter = await db
			.select()
			.from(emailDomains)
			.where(eq(emailDomains.clientId, alpha.id));
		const sequencesAfter = await db
			.select()
			.from(emailSequences)
			.where(eq(emailSequences.clientId, alpha.id));
		const stepsAfter = await db
			.select()
			.from(emailSequenceSteps)
			.where(eq(emailSequenceSteps.clientId, alpha.id));
		const servicesAfter = await db.select().from(services).where(eq(services.clientId, alpha.id));
		const offersAfter = await db.select().from(offers).where(eq(offers.clientId, alpha.id));
		const claimsAfter = await db.select().from(claims).where(eq(claims.clientId, alpha.id));
		const versionsAfter = await db
			.select()
			.from(pageVersions)
			.where(eq(pageVersions.pageId, home.id));
		const [brandAfter] = await db
			.select()
			.from(brands)
			.where(eq(brands.clientId, alpha.id))
			.limit(1);
		const betaServices = await db.select().from(services).where(eq(services.clientId, beta.id));

		expect(leadsAfter).toHaveLength(0);
		expect(goalsAfter).toHaveLength(0);
		expect(domainsAfter).toHaveLength(0);
		expect(sequencesAfter.map((row) => row.key)).toEqual(['welcome_v1']);
		expect(sequencesAfter[0]?.status).toBe('approved');
		expect(stepsAfter.map((step) => step.stepIndex).sort()).toEqual([0, 1]);
		expect(stepsAfter.find((step) => step.stepIndex === 0)?.subject).toBe(
			'We received your consult request'
		);
		expect(servicesAfter.map((row) => row.slug)).toEqual(['implant-consult']);
		expect(offersAfter.map((row) => row.name)).toEqual(['Consult package']);
		expect(claimsAfter.map((row) => row.statement).sort()).toEqual([
			'Consults include a written treatment plan',
			'Guaranteed implant success'
		]);
		expect(versionsAfter.map((row) => row.id)).toEqual([home.publishedVersionId]);
		expect(brandAfter?.displayName).toBe('Client Alpha Dental');
		expect(betaServices.map((row) => row.slug)).toEqual(['warehouse-assessment']);
		const sharedLeft = await db
			.select()
			.from(emailSuppressions)
			.where(eq(emailSuppressions.email, sharedComplaint));
		const kept = await db
			.select()
			.from(emailSuppressions)
			.where(eq(emailSuppressions.email, keptComplaint));
		expect(sharedLeft).toHaveLength(0);
		expect(kept).toHaveLength(1);
		expect(kept[0]?.scope).toBe('global');
	} finally {
		await db.delete(emailSuppressions).where(eq(emailSuppressions.email, keptComplaint));
	}
}, 20000);
