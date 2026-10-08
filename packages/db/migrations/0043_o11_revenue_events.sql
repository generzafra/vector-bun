CREATE TABLE "revenue_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"lead_id" uuid,
	"sales_outcome_id" uuid,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"source" text NOT NULL,
	"evidence_class" text NOT NULL,
	"note" text,
	"idempotency_key" text,
	"recorded_by" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_sales_outcome_id_sales_outcomes_id_fk" FOREIGN KEY ("sales_outcome_id") REFERENCES "public"."sales_outcomes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "revenue_events_client_idx" ON "revenue_events" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "revenue_events_client_occurred_idx" ON "revenue_events" USING btree ("client_id","occurred_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_events_client_idempotency_idx" ON "revenue_events" USING btree ("client_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX "revenue_events_org_idx" ON "revenue_events" USING btree ("organization_id");
--> statement-breakpoint
INSERT INTO "permissions" ("id", "key", "name", "created_at")
SELECT gen_random_uuid(), 'outcomes.read', 'outcomes.read', now()
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "key" = 'outcomes.read');
--> statement-breakpoint
INSERT INTO "permissions" ("id", "key", "name", "created_at")
SELECT gen_random_uuid(), 'outcomes.manage', 'outcomes.manage', now()
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "key" = 'outcomes.manage');
--> statement-breakpoint
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), roles.id, permissions.id
FROM "roles"
JOIN "permissions" ON permissions.key = 'outcomes.read'
WHERE roles.key IN ('mge_super_admin', 'mge_operator', 'client_owner', 'client_admin', 'read_only')
AND NOT EXISTS (
	SELECT 1 FROM "role_permissions" existing
	WHERE existing.role_id = roles.id AND existing.permission_id = permissions.id
);
--> statement-breakpoint
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), roles.id, permissions.id
FROM "roles"
JOIN "permissions" ON permissions.key = 'outcomes.manage'
WHERE roles.key IN ('mge_super_admin', 'mge_operator', 'client_owner', 'client_admin')
AND NOT EXISTS (
	SELECT 1 FROM "role_permissions" existing
	WHERE existing.role_id = roles.id AND existing.permission_id = permissions.id
);
