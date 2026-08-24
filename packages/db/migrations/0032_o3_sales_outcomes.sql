CREATE TABLE "sales_outcomes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"outcome_type" text NOT NULL,
	"amount_minor" integer,
	"currency" text,
	"note" text,
	"recorded_by" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_outcomes" ADD CONSTRAINT "sales_outcomes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_outcomes" ADD CONSTRAINT "sales_outcomes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_outcomes" ADD CONSTRAINT "sales_outcomes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sales_outcomes_client_idx" ON "sales_outcomes" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "sales_outcomes_client_lead_idx" ON "sales_outcomes" USING btree ("client_id","lead_id");
--> statement-breakpoint
CREATE INDEX "sales_outcomes_org_idx" ON "sales_outcomes" USING btree ("organization_id");
