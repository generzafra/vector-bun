CREATE TYPE "public"."experiment_decision_outcome" AS ENUM('keep_control', 'promote_challenger', 'inconclusive');
--> statement-breakpoint
CREATE TABLE "experiment_decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"result_id" uuid NOT NULL,
	"outcome" "experiment_decision_outcome" NOT NULL,
	"winner_variant_key" text,
	"promoted_page_version_id" uuid,
	"notes" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_learning_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"client_label" text NOT NULL,
	"industry" text DEFAULT 'unknown' NOT NULL,
	"audience" text NOT NULL,
	"hypothesis" text NOT NULL,
	"change" text NOT NULL,
	"result" text NOT NULL,
	"confidence" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"decision" "experiment_decision_outcome" NOT NULL,
	"notes" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiment_decisions" ADD CONSTRAINT "experiment_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_decisions" ADD CONSTRAINT "experiment_decisions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_decisions" ADD CONSTRAINT "experiment_decisions_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_decisions" ADD CONSTRAINT "experiment_decisions_result_id_experiment_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."experiment_results"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_decisions" ADD CONSTRAINT "experiment_decisions_promoted_page_version_id_page_versions_id_fk" FOREIGN KEY ("promoted_page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_learning_objects" ADD CONSTRAINT "experiment_learning_objects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_learning_objects" ADD CONSTRAINT "experiment_learning_objects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_learning_objects" ADD CONSTRAINT "experiment_learning_objects_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_learning_objects" ADD CONSTRAINT "experiment_learning_objects_decision_id_experiment_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."experiment_decisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_decisions_experiment_idx" ON "experiment_decisions" USING btree ("experiment_id");
--> statement-breakpoint
CREATE INDEX "experiment_decisions_client_idx" ON "experiment_decisions" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_learning_objects_experiment_idx" ON "experiment_learning_objects" USING btree ("experiment_id");
--> statement-breakpoint
CREATE INDEX "experiment_learning_objects_client_idx" ON "experiment_learning_objects" USING btree ("client_id");
