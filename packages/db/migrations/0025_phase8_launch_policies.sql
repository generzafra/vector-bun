CREATE TABLE "launch_automation_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"launch_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"unpublished_drafts_only" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "launch_automation_policies_type_chk" CHECK (
		"action_type" IN ('launch.queue_qa', 'launch.wire_tracking', 'launch.generate_drafts')
	),
	CONSTRAINT "launch_automation_policies_drafts_chk" CHECK ("unpublished_drafts_only" = true),
	CONSTRAINT "launch_automation_policies_generate_chk" CHECK (
		"action_type" <> 'launch.generate_drafts' OR "enabled" = false
	)
);
--> statement-breakpoint
ALTER TABLE "launch_automation_policies" ADD CONSTRAINT "launch_automation_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "launch_automation_policies" ADD CONSTRAINT "launch_automation_policies_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "launch_automation_policies" ADD CONSTRAINT "launch_automation_policies_launch_id_client_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."client_launches"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "launch_automation_policies_client_action_idx" ON "launch_automation_policies" USING btree ("client_id", "action_type");
--> statement-breakpoint
CREATE INDEX "launch_automation_policies_client_idx" ON "launch_automation_policies" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "launch_automation_policies_launch_idx" ON "launch_automation_policies" USING btree ("launch_id");
