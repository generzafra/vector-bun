CREATE TABLE "launch_draft_event_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"launch_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"page_version_id" uuid NOT NULL,
	"events" jsonb NOT NULL,
	"unpublished_drafts_only" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "launch_draft_event_plans_drafts_chk" CHECK ("unpublished_drafts_only" = true)
);
--> statement-breakpoint
ALTER TABLE "launch_draft_event_plans" ADD CONSTRAINT "launch_draft_event_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "launch_draft_event_plans" ADD CONSTRAINT "launch_draft_event_plans_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "launch_draft_event_plans" ADD CONSTRAINT "launch_draft_event_plans_launch_id_client_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."client_launches"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "launch_draft_event_plans" ADD CONSTRAINT "launch_draft_event_plans_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "launch_draft_event_plans" ADD CONSTRAINT "launch_draft_event_plans_page_version_id_page_versions_id_fk" FOREIGN KEY ("page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "launch_draft_event_plans_client_version_idx" ON "launch_draft_event_plans" USING btree ("client_id", "page_version_id");
--> statement-breakpoint
CREATE INDEX "launch_draft_event_plans_client_idx" ON "launch_draft_event_plans" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "launch_draft_event_plans_launch_idx" ON "launch_draft_event_plans" USING btree ("launch_id");
