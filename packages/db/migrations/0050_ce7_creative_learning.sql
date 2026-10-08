CREATE TABLE "creative_learning_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"experiment_learning_id" uuid NOT NULL,
	"control_page_version_id" uuid,
	"challenger_page_version_id" uuid,
	"status" text NOT NULL,
	"evidence" text NOT NULL,
	"statement" text NOT NULL,
	"auto_apply" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creative_learning_objects_status_check" CHECK ("status" IN ('insufficient', 'hypothesis')),
	CONSTRAINT "creative_learning_objects_evidence_check" CHECK ("evidence" IN ('observed', 'unknown')),
	CONSTRAINT "creative_learning_objects_auto_apply_check" CHECK ("auto_apply" = false)
);
--> statement-breakpoint
ALTER TABLE "creative_learning_objects" ADD CONSTRAINT "creative_learning_objects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_learning_objects" ADD CONSTRAINT "creative_learning_objects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_learning_objects" ADD CONSTRAINT "creative_learning_objects_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_learning_objects" ADD CONSTRAINT "creative_learning_objects_experiment_learning_id_experiment_learning_objects_id_fk" FOREIGN KEY ("experiment_learning_id") REFERENCES "public"."experiment_learning_objects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_learning_objects" ADD CONSTRAINT "creative_learning_objects_control_page_version_id_page_versions_id_fk" FOREIGN KEY ("control_page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_learning_objects" ADD CONSTRAINT "creative_learning_objects_challenger_page_version_id_page_versions_id_fk" FOREIGN KEY ("challenger_page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "creative_learning_objects_experiment_idx" ON "creative_learning_objects" USING btree ("experiment_id");
--> statement-breakpoint
CREATE INDEX "creative_learning_objects_client_idx" ON "creative_learning_objects" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "creative_learning_objects_org_idx" ON "creative_learning_objects" USING btree ("organization_id");
