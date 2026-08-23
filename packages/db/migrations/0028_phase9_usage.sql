CREATE TYPE "public"."usage_resource_family" AS ENUM('api', 'workflow', 'ai', 'email', 'upload', 'analytics');
--> statement-breakpoint
CREATE TYPE "public"."usage_window" AS ENUM('minute', 'hour', 'day', 'month');
--> statement-breakpoint
CREATE TYPE "public"."usage_limit_mode" AS ENUM('evaluate_only', 'enforce');
--> statement-breakpoint
CREATE TYPE "public"."usage_event_outcome" AS ENUM('recorded', 'would_deny');
--> statement-breakpoint
CREATE TABLE "tenant_usage_limits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"resource_family" "usage_resource_family" NOT NULL,
	"window" "usage_window" NOT NULL,
	"hard_limit" integer NOT NULL,
	"warning_percent" integer DEFAULT 80 NOT NULL,
	"mode" "usage_limit_mode" DEFAULT 'evaluate_only' NOT NULL,
	"override_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_usage_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"resource_family" "usage_resource_family" NOT NULL,
	"window" "usage_window" NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"quantity" integer NOT NULL,
	"used_before" integer NOT NULL,
	"hard_limit" integer NOT NULL,
	"warning_percent" integer NOT NULL,
	"mode" "usage_limit_mode" NOT NULL,
	"outcome" "usage_event_outcome" NOT NULL,
	"request_id" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_usage_limits" ADD CONSTRAINT "tenant_usage_limits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_usage_limits" ADD CONSTRAINT "tenant_usage_limits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_usage_events" ADD CONSTRAINT "tenant_usage_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_usage_events" ADD CONSTRAINT "tenant_usage_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_usage_limits_client_family_idx" ON "tenant_usage_limits" USING btree ("client_id", "resource_family");
--> statement-breakpoint
CREATE INDEX "tenant_usage_limits_client_idx" ON "tenant_usage_limits" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_usage_events_idempotency_idx" ON "tenant_usage_events" USING btree ("client_id", "request_id", "resource_family");
--> statement-breakpoint
CREATE INDEX "tenant_usage_events_window_idx" ON "tenant_usage_events" USING btree ("client_id", "resource_family", "window_started_at");
