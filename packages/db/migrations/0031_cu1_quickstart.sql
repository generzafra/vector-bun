CREATE TABLE "client_outcome_quickstarts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"goal_choice" text NOT NULL,
	"goal_other" text,
	"has_target" boolean NOT NULL,
	"target_value" integer,
	"period" text,
	"currency" text,
	"good_lead" text NOT NULL,
	"good_lead_other" text,
	"after_contact" text NOT NULL,
	"after_contact_other" text,
	"sale" text NOT NULL,
	"sale_other" text,
	"crm" text NOT NULL,
	"crm_note" text,
	"notify_high_intent" boolean NOT NULL,
	"approver" text NOT NULL,
	"approver_note" text,
	"approver_user_id" text,
	"created_by" text,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_outcome_quickstarts" ADD CONSTRAINT "client_outcome_quickstarts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_outcome_quickstarts" ADD CONSTRAINT "client_outcome_quickstarts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "client_outcome_quickstarts_client_idx" ON "client_outcome_quickstarts" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "client_outcome_quickstarts_org_idx" ON "client_outcome_quickstarts" USING btree ("organization_id");
