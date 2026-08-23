CREATE TYPE "public"."experiment_status" AS ENUM('draft', 'proposed', 'approved', 'running', 'paused', 'decided', 'archived');
--> statement-breakpoint
CREATE TYPE "public"."experiment_variant_role" AS ENUM('control', 'challenger');
--> statement-breakpoint
CREATE TYPE "public"."experiment_audience" AS ENUM('all_visitors');
--> statement-breakpoint
CREATE TYPE "public"."experiment_primary_metric" AS ENUM('cta_clicked', 'form_started', 'form_submitted', 'lead_created');
--> statement-breakpoint
CREATE TYPE "public"."experiment_decision_rule" AS ENUM('fixed_horizon', 'manual_review');
--> statement-breakpoint
CREATE TYPE "public"."experiment_rollback_rule" AS ENUM('revert_to_control', 'pause_experiment');
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "experiment_status" DEFAULT 'proposed' NOT NULL,
	"audience_key" "experiment_audience" DEFAULT 'all_visitors' NOT NULL,
	"primary_metric" "experiment_primary_metric" NOT NULL,
	"guardrail_metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_duration_days" integer NOT NULL,
	"min_sample_per_variant" integer NOT NULL,
	"decision_rule" "experiment_decision_rule" DEFAULT 'fixed_horizon' NOT NULL,
	"rollback_rule" "experiment_rollback_rule" DEFAULT 'revert_to_control' NOT NULL,
	"launched_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_hypotheses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"problem" text NOT NULL,
	"evidence" text NOT NULL,
	"hypothesis" text NOT NULL,
	"audience" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"role" "experiment_variant_role" NOT NULL,
	"page_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_hypotheses" ADD CONSTRAINT "experiment_hypotheses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_hypotheses" ADD CONSTRAINT "experiment_hypotheses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_hypotheses" ADD CONSTRAINT "experiment_hypotheses_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_page_version_id_page_versions_id_fk" FOREIGN KEY ("page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "experiments_client_idx" ON "experiments" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "experiments_client_status_idx" ON "experiments" USING btree ("client_id","status");
--> statement-breakpoint
CREATE INDEX "experiments_client_page_idx" ON "experiments" USING btree ("client_id","page_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_hypotheses_experiment_idx" ON "experiment_hypotheses" USING btree ("experiment_id");
--> statement-breakpoint
CREATE INDEX "experiment_hypotheses_client_idx" ON "experiment_hypotheses" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_variants_experiment_key_idx" ON "experiment_variants" USING btree ("experiment_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_variants_experiment_version_idx" ON "experiment_variants" USING btree ("experiment_id","page_version_id");
--> statement-breakpoint
CREATE INDEX "experiment_variants_client_idx" ON "experiment_variants" USING btree ("client_id");
