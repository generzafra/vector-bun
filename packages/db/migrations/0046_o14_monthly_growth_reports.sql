CREATE TABLE "monthly_growth_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"time_zone" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"qualified_leads" integer NOT NULL,
	"sales_count" integer,
	"sales_evidence" text NOT NULL,
	"revenue_amount_minor" integer,
	"revenue_currency" text,
	"revenue_evidence" text NOT NULL,
	"revenue_detail" text NOT NULL,
	"handled_count" integer NOT NULL,
	"attribution_evidence" text NOT NULL,
	"data_health_evidence" text NOT NULL,
	"narrative" text NOT NULL,
	"recorded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monthly_growth_reports" ADD CONSTRAINT "monthly_growth_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "monthly_growth_reports" ADD CONSTRAINT "monthly_growth_reports_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "monthly_growth_reports" ADD CONSTRAINT "monthly_growth_reports_evidence_check" CHECK (
	"sales_evidence" IN ('observed', 'unknown')
	AND "revenue_evidence" IN ('observed', 'unknown')
	AND "attribution_evidence" IN ('observed', 'measured', 'inferred', 'estimated', 'unknown')
	AND "data_health_evidence" IN ('observed', 'measured', 'inferred', 'estimated', 'unknown')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_growth_reports_client_period_idx" ON "monthly_growth_reports" USING btree ("client_id","period_key");
--> statement-breakpoint
CREATE INDEX "monthly_growth_reports_client_idx" ON "monthly_growth_reports" USING btree ("client_id");
