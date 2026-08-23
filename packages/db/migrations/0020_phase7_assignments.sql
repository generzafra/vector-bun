CREATE TABLE "experiment_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"visitor_anonymous_id" text NOT NULL,
	"variant_id" uuid NOT NULL,
	"variant_key" text NOT NULL,
	"page_version_id" uuid NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_variant_id_experiment_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."experiment_variants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_page_version_id_page_versions_id_fk" FOREIGN KEY ("page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_assignments_visitor_idx" ON "experiment_assignments" USING btree ("client_id","experiment_id","visitor_anonymous_id");
--> statement-breakpoint
CREATE INDEX "experiment_assignments_client_idx" ON "experiment_assignments" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "experiment_assignments_experiment_idx" ON "experiment_assignments" USING btree ("experiment_id");
