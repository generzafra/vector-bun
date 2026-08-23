CREATE TYPE "public"."search_work_kind" AS ENUM('technical_audit', 'property_sync', 'aeo_refresh', 'geo_snapshot', 'geo_measure', 'stale_measurement', 'budget');
--> statement-breakpoint
CREATE TYPE "public"."search_work_status" AS ENUM('due', 'blocked', 'clear');
--> statement-breakpoint
CREATE TABLE "search_cadence_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"technical_audit_interval_days" integer DEFAULT 7 NOT NULL,
	"property_sync_interval_days" integer DEFAULT 7 NOT NULL,
	"aeo_refresh_interval_days" integer DEFAULT 7 NOT NULL,
	"geo_snapshot_interval_days" integer DEFAULT 7 NOT NULL,
	"geo_measure_interval_days" integer DEFAULT 7 NOT NULL,
	"geo_query_limit" integer DEFAULT 20 NOT NULL,
	"geo_engine_limit" integer DEFAULT 5 NOT NULL,
	"geo_locale_limit" integer DEFAULT 2 NOT NULL,
	"monthly_budget_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"last_technical_audit_at" timestamp with time zone,
	"last_property_sync_at" timestamp with time zone,
	"last_aeo_refresh_at" timestamp with time zone,
	"last_geo_snapshot_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_work_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"kind" "search_work_kind" NOT NULL,
	"status" "search_work_status" NOT NULL,
	"detail" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_cadence_settings" ADD CONSTRAINT "search_cadence_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "search_cadence_settings" ADD CONSTRAINT "search_cadence_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "search_work_items" ADD CONSTRAINT "search_work_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "search_work_items" ADD CONSTRAINT "search_work_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "search_cadence_settings_client_idx" ON "search_cadence_settings" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "search_cadence_settings_org_idx" ON "search_cadence_settings" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "search_work_items_client_kind_idx" ON "search_work_items" USING btree ("client_id","kind");
--> statement-breakpoint
CREATE INDEX "search_work_items_client_idx" ON "search_work_items" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "search_work_items_status_idx" ON "search_work_items" USING btree ("status");
