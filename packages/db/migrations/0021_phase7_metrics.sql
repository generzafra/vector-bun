CREATE TYPE "public"."experiment_metric_kind" AS ENUM('primary', 'guardrail');
--> statement-breakpoint
CREATE TABLE "experiment_metrics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"kind" "experiment_metric_kind" NOT NULL,
	"event_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"horizon_met" boolean NOT NULL,
	"sample_met" boolean NOT NULL,
	"bot_contamination" boolean NOT NULL,
	"source_imbalance" boolean NOT NULL,
	"early_stop_blocked" boolean NOT NULL,
	"decision_ready" boolean NOT NULL,
	"bot_share_bps" integer NOT NULL,
	"control_sample" integer NOT NULL,
	"challenger_sample" integer NOT NULL,
	"control_primary_count" integer NOT NULL,
	"challenger_primary_count" integer NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metric_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_shares" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiment_metrics" ADD CONSTRAINT "experiment_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_metrics" ADD CONSTRAINT "experiment_metrics_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_metrics" ADD CONSTRAINT "experiment_metrics_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_results" ADD CONSTRAINT "experiment_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_results" ADD CONSTRAINT "experiment_results_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_results" ADD CONSTRAINT "experiment_results_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_metrics_experiment_event_idx" ON "experiment_metrics" USING btree ("experiment_id","event_name");
--> statement-breakpoint
CREATE INDEX "experiment_metrics_client_idx" ON "experiment_metrics" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "experiment_results_client_idx" ON "experiment_results" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "experiment_results_experiment_idx" ON "experiment_results" USING btree ("experiment_id");
