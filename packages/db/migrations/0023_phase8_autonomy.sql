CREATE TYPE "public"."ai_kill_switch_scope" AS ENUM('client', 'platform');
--> statement-breakpoint
CREATE TABLE "ai_action_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"action_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"risk_class" "ai_risk_class" NOT NULL,
	"default_autonomy" integer NOT NULL,
	"max_autonomy" integer NOT NULL,
	"auto_execute_allowed" boolean DEFAULT false NOT NULL,
	"forbidden" boolean DEFAULT false NOT NULL,
	"financial_limit_minor" integer DEFAULT 0 NOT NULL,
	"financial_currency" text DEFAULT 'USD' NOT NULL,
	"content_limit" text DEFAULT 'none' NOT NULL,
	"provider_limit" text DEFAULT 'none' NOT NULL,
	"approval_expiry_seconds" integer,
	"rollback_supported" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_kill_switch_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"client_id" uuid,
	"scope" "ai_kill_switch_scope" NOT NULL,
	"paused" boolean NOT NULL,
	"previous_paused" boolean NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text,
	"privileged" boolean DEFAULT true NOT NULL,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_kill_switch_events_scope_chk" CHECK (
		("scope" = 'client' AND "organization_id" IS NOT NULL AND "client_id" IS NOT NULL)
		OR ("scope" = 'platform' AND "client_id" IS NULL)
	)
);
--> statement-breakpoint
ALTER TABLE "ai_kill_switch_events" ADD CONSTRAINT "ai_kill_switch_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_kill_switch_events" ADD CONSTRAINT "ai_kill_switch_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_action_policies_type_idx" ON "ai_action_policies" USING btree ("action_type");
--> statement-breakpoint
CREATE INDEX "ai_kill_switch_events_client_idx" ON "ai_kill_switch_events" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "ai_kill_switch_events_scope_idx" ON "ai_kill_switch_events" USING btree ("scope");
