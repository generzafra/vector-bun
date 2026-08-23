CREATE TYPE "public"."ai_action_execution_status" AS ENUM('succeeded', 'blocked', 'failed');
--> statement-breakpoint
CREATE TABLE "ai_action_executions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"status" "ai_action_execution_status" NOT NULL,
	"autonomy_level" integer DEFAULT 3 NOT NULL,
	"blocked_by" text,
	"confidence_ignored" boolean DEFAULT true NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_id" text NOT NULL,
	"actor_id" text,
	"output" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_action_executions" ADD CONSTRAINT "ai_action_executions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_action_executions" ADD CONSTRAINT "ai_action_executions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_action_executions_idempotency_idx" ON "ai_action_executions" USING btree ("client_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX "ai_action_executions_client_idx" ON "ai_action_executions" USING btree ("client_id", "created_at");
