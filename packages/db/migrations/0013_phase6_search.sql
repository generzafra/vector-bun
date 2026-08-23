CREATE TYPE "public"."seo_engine" AS ENUM('google', 'bing');
--> statement-breakpoint
CREATE TYPE "public"."seo_property_status" AS ENUM('pending', 'active', 'expired', 'revoked');
--> statement-breakpoint
CREATE TYPE "public"."seo_audit_kind" AS ENUM('technical');
--> statement-breakpoint
CREATE TYPE "public"."seo_audit_status" AS ENUM('completed', 'failed');
--> statement-breakpoint
CREATE TYPE "public"."seo_issue_severity" AS ENUM('low', 'medium', 'high');
--> statement-breakpoint
CREATE TYPE "public"."seo_issue_status" AS ENUM('open', 'resolved');
--> statement-breakpoint
CREATE TYPE "public"."seo_opportunity_channel" AS ENUM('seo', 'aeo', 'geo');
--> statement-breakpoint
CREATE TYPE "public"."seo_opportunity_status" AS ENUM('proposed', 'accepted', 'rejected', 'publish_ready', 'done');
--> statement-breakpoint
CREATE TYPE "public"."seo_effort" AS ENUM('low', 'medium', 'high');
--> statement-breakpoint
CREATE TYPE "public"."seo_evidence_class" AS ENUM('observed', 'measured', 'provider_reported', 'client_verified', 'source_verified', 'inferred', 'estimated', 'hypothesis', 'unknown');
--> statement-breakpoint
CREATE TYPE "public"."seo_source_kind" AS ENUM('knowledge_claim', 'official_query', 'technical_audit', 'page');
--> statement-breakpoint
CREATE TABLE "seo_properties" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"engine" "seo_engine" NOT NULL,
	"site_url" text NOT NULL,
	"status" "seo_property_status" DEFAULT 'pending' NOT NULL,
	"encrypted_credential" text,
	"last_validated_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_pages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"property_id" uuid,
	"page_id" uuid,
	"path" text NOT NULL,
	"url" text,
	"title" text,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr_bps" integer DEFAULT 0 NOT NULL,
	"position_milli" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_keywords" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"phrase" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_queries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"keyword_id" uuid,
	"query" text NOT NULL,
	"page_url" text DEFAULT '' NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr_bps" integer DEFAULT 0 NOT NULL,
	"position_milli" integer DEFAULT 0 NOT NULL,
	"date" text NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_audits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"kind" "seo_audit_kind" DEFAULT 'technical' NOT NULL,
	"status" "seo_audit_status" DEFAULT 'completed' NOT NULL,
	"summary" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_issues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"page_id" uuid,
	"path" text,
	"code" text NOT NULL,
	"severity" "seo_issue_severity" NOT NULL,
	"evidence_class" "seo_evidence_class" DEFAULT 'observed' NOT NULL,
	"detail" text NOT NULL,
	"status" "seo_issue_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_opportunities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"channel" "seo_opportunity_channel" NOT NULL,
	"title" text NOT NULL,
	"problem" text NOT NULL,
	"proposed_action" text NOT NULL,
	"evidence_class" "seo_evidence_class" NOT NULL,
	"source_kind" "seo_source_kind" NOT NULL,
	"source_id" text NOT NULL,
	"page_id" uuid,
	"query_id" uuid,
	"priority" integer DEFAULT 1 NOT NULL,
	"effort" "seo_effort" DEFAULT 'medium' NOT NULL,
	"status" "seo_opportunity_status" DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_properties" ADD CONSTRAINT "seo_properties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_properties" ADD CONSTRAINT "seo_properties_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_pages" ADD CONSTRAINT "seo_pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_pages" ADD CONSTRAINT "seo_pages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_pages" ADD CONSTRAINT "seo_pages_property_id_seo_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."seo_properties"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_pages" ADD CONSTRAINT "seo_pages_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_keywords" ADD CONSTRAINT "seo_keywords_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_keywords" ADD CONSTRAINT "seo_keywords_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_queries" ADD CONSTRAINT "seo_queries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_queries" ADD CONSTRAINT "seo_queries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_queries" ADD CONSTRAINT "seo_queries_property_id_seo_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."seo_properties"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_queries" ADD CONSTRAINT "seo_queries_keyword_id_seo_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."seo_keywords"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_audit_id_seo_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."seo_audits"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_opportunities" ADD CONSTRAINT "seo_opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_opportunities" ADD CONSTRAINT "seo_opportunities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_opportunities" ADD CONSTRAINT "seo_opportunities_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seo_opportunities" ADD CONSTRAINT "seo_opportunities_query_id_seo_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."seo_queries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "seo_properties_client_engine_site_idx" ON "seo_properties" USING btree ("client_id","engine","site_url");
--> statement-breakpoint
CREATE INDEX "seo_properties_client_idx" ON "seo_properties" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "seo_pages_client_path_idx" ON "seo_pages" USING btree ("client_id","path");
--> statement-breakpoint
CREATE INDEX "seo_pages_client_idx" ON "seo_pages" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "seo_keywords_client_phrase_locale_idx" ON "seo_keywords" USING btree ("client_id","phrase","locale");
--> statement-breakpoint
CREATE INDEX "seo_keywords_client_idx" ON "seo_keywords" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "seo_queries_unique_idx" ON "seo_queries" USING btree ("client_id","property_id","query","page_url","date","country","device");
--> statement-breakpoint
CREATE INDEX "seo_queries_client_idx" ON "seo_queries" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "seo_audits_client_idx" ON "seo_audits" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "seo_issues_client_idx" ON "seo_issues" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "seo_issues_client_status_idx" ON "seo_issues" USING btree ("client_id","status");
--> statement-breakpoint
CREATE INDEX "seo_opportunities_client_idx" ON "seo_opportunities" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "seo_opportunities_client_status_idx" ON "seo_opportunities" USING btree ("client_id","status");
--> statement-breakpoint
CREATE INDEX "seo_opportunities_client_channel_idx" ON "seo_opportunities" USING btree ("client_id","channel");
