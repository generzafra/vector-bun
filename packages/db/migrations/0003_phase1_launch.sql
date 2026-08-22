CREATE TYPE "public"."readiness_item_status" AS ENUM('pending', 'complete', 'not_applicable');
--> statement-breakpoint
CREATE TYPE "public"."readiness_item_source" AS ENUM('automatic', 'operator');
--> statement-breakpoint
CREATE TYPE "public"."launch_status" AS ENUM('draft', 'onboarding', 'blocked', 'vector_ready', 'generating', 'qa', 'awaiting_client_approval', 'awaiting_domain', 'launching', 'live', 'launch_failed', 'paused');
--> statement-breakpoint
CREATE TYPE "public"."launch_class" AS ENUM('A', 'B', 'C', 'D');
--> statement-breakpoint
CREATE TYPE "public"."launch_approval_kind" AS ENUM('client_launch', 'internal_qa');
--> statement-breakpoint
CREATE TYPE "public"."launch_approval_status" AS ENUM('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TABLE "client_readiness" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"score_percent" integer DEFAULT 0 NOT NULL,
	"blocking_complete" integer DEFAULT 0 NOT NULL,
	"blocking_total" integer DEFAULT 0 NOT NULL,
	"optional_complete" integer DEFAULT 0 NOT NULL,
	"optional_total" integer DEFAULT 0 NOT NULL,
	"vector_ready" boolean DEFAULT false NOT NULL,
	"computed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "client_readiness_client_idx" ON "client_readiness" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "client_readiness_org_idx" ON "client_readiness" USING btree ("organization_id");
--> statement-breakpoint
CREATE TABLE "client_readiness_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"key" text NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"blocking" boolean NOT NULL,
	"status" "readiness_item_status" DEFAULT 'pending' NOT NULL,
	"source" "readiness_item_source" NOT NULL,
	"detail" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "client_readiness_items_client_key_idx" ON "client_readiness_items" USING btree ("client_id","key");
--> statement-breakpoint
CREATE INDEX "client_readiness_items_client_idx" ON "client_readiness_items" USING btree ("client_id");
--> statement-breakpoint
CREATE TABLE "client_launches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"launch_class" "launch_class" DEFAULT 'B' NOT NULL,
	"status" "launch_status" DEFAULT 'draft' NOT NULL,
	"signed_at" timestamp with time zone,
	"onboarding_started_at" timestamp with time zone,
	"vector_ready_at" timestamp with time zone,
	"generation_started_at" timestamp with time zone,
	"qa_started_at" timestamp with time zone,
	"approval_requested_at" timestamp with time zone,
	"approval_received_at" timestamp with time zone,
	"domain_ready_at" timestamp with time zone,
	"launch_started_at" timestamp with time zone,
	"live_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"paused_seconds" integer DEFAULT 0 NOT NULL,
	"resume_status" "launch_status",
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "client_launches_client_idx" ON "client_launches" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "client_launches_org_idx" ON "client_launches" USING btree ("organization_id");
--> statement-breakpoint
CREATE TABLE "client_launch_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"launch_id" uuid NOT NULL,
	"from_status" "launch_status" NOT NULL,
	"to_status" "launch_status" NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "client_launch_events_client_idx" ON "client_launch_events" USING btree ("client_id");
--> statement-breakpoint
CREATE TABLE "client_launch_blocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"launch_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"message" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "client_launch_blocks_client_idx" ON "client_launch_blocks" USING btree ("client_id");
--> statement-breakpoint
CREATE TABLE "client_launch_approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"launch_id" uuid NOT NULL,
	"kind" "launch_approval_kind" NOT NULL,
	"status" "launch_approval_status" DEFAULT 'pending' NOT NULL,
	"actor_id" text,
	"note" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "client_launch_approvals_client_idx" ON "client_launch_approvals" USING btree ("client_id");
--> statement-breakpoint
ALTER TABLE "client_readiness" ADD CONSTRAINT "client_readiness_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_readiness" ADD CONSTRAINT "client_readiness_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_readiness_items" ADD CONSTRAINT "client_readiness_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_readiness_items" ADD CONSTRAINT "client_readiness_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launches" ADD CONSTRAINT "client_launches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launches" ADD CONSTRAINT "client_launches_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launch_events" ADD CONSTRAINT "client_launch_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launch_events" ADD CONSTRAINT "client_launch_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launch_events" ADD CONSTRAINT "client_launch_events_launch_id_client_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."client_launches"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launch_blocks" ADD CONSTRAINT "client_launch_blocks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launch_blocks" ADD CONSTRAINT "client_launch_blocks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launch_blocks" ADD CONSTRAINT "client_launch_blocks_launch_id_client_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."client_launches"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launch_approvals" ADD CONSTRAINT "client_launch_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launch_approvals" ADD CONSTRAINT "client_launch_approvals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_launch_approvals" ADD CONSTRAINT "client_launch_approvals_launch_id_client_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."client_launches"("id") ON DELETE no action ON UPDATE no action;
