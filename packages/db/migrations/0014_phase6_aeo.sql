CREATE TYPE "public"."schema_entity_kind" AS ENUM('organization', 'service', 'offer');
--> statement-breakpoint
CREATE TYPE "public"."schema_entity_source_kind" AS ENUM('brand', 'service', 'offer');
--> statement-breakpoint
CREATE TYPE "public"."schema_entity_status" AS ENUM('current', 'stale');
--> statement-breakpoint
CREATE TYPE "public"."answer_target_source_kind" AS ENUM('brand', 'service', 'offer', 'knowledge_claim');
--> statement-breakpoint
CREATE TYPE "public"."answer_target_intent" AS ENUM('definition', 'use_case');
--> statement-breakpoint
CREATE TYPE "public"."answer_target_status" AS ENUM('mapped', 'gap');
--> statement-breakpoint
CREATE TYPE "public"."content_brief_status" AS ENUM('draft');
--> statement-breakpoint
CREATE TABLE "schema_entities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"kind" "schema_entity_kind" NOT NULL,
	"source_kind" "schema_entity_source_kind" NOT NULL,
	"source_id" uuid NOT NULL,
	"name" text NOT NULL,
	"fact" text NOT NULL,
	"status" "schema_entity_status" DEFAULT 'current' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_targets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"source_kind" "answer_target_source_kind" NOT NULL,
	"source_id" uuid NOT NULL,
	"intent" "answer_target_intent" NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"page_id" uuid,
	"status" "answer_target_status" DEFAULT 'gap' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_briefs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"answer_target_id" uuid NOT NULL,
	"claim_id" uuid,
	"page_id" uuid,
	"title" text NOT NULL,
	"problem" text NOT NULL,
	"proposed_action" text NOT NULL,
	"status" "content_brief_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schema_entities" ADD CONSTRAINT "schema_entities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "schema_entities" ADD CONSTRAINT "schema_entities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "answer_targets" ADD CONSTRAINT "answer_targets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "answer_targets" ADD CONSTRAINT "answer_targets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "answer_targets" ADD CONSTRAINT "answer_targets_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_answer_target_id_answer_targets_id_fk" FOREIGN KEY ("answer_target_id") REFERENCES "public"."answer_targets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "schema_entities_client_source_idx" ON "schema_entities" USING btree ("client_id","kind","source_kind","source_id");
--> statement-breakpoint
CREATE INDEX "schema_entities_client_idx" ON "schema_entities" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "answer_targets_client_source_intent_idx" ON "answer_targets" USING btree ("client_id","source_kind","source_id","intent");
--> statement-breakpoint
CREATE INDEX "answer_targets_client_idx" ON "answer_targets" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "answer_targets_client_status_idx" ON "answer_targets" USING btree ("client_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_briefs_client_target_idx" ON "content_briefs" USING btree ("client_id","answer_target_id");
--> statement-breakpoint
CREATE INDEX "content_briefs_client_idx" ON "content_briefs" USING btree ("client_id");
