CREATE TYPE "public"."geo_query_group" AS ENUM('brand', 'service', 'product', 'high_intent', 'informational');
--> statement-breakpoint
CREATE TYPE "public"."geo_query_source_kind" AS ENUM('brand', 'service', 'offer');
--> statement-breakpoint
CREATE TYPE "public"."geo_query_set_status" AS ENUM('active', 'archived');
--> statement-breakpoint
CREATE TYPE "public"."geo_surface" AS ENUM('chatgpt', 'google_ai_overview', 'gemini', 'perplexity', 'other');
--> statement-breakpoint
CREATE TYPE "public"."geo_measurement_method" AS ENUM('manual', 'operator_assisted');
--> statement-breakpoint
CREATE TYPE "public"."geo_run_status" AS ENUM('recorded');
--> statement-breakpoint
CREATE TYPE "public"."geo_prominence" AS ENUM('unknown', 'mentioned', 'cited', 'primary');
--> statement-breakpoint
CREATE TYPE "public"."geo_accuracy" AS ENUM('yes', 'no', 'unknown');
--> statement-breakpoint
CREATE TYPE "public"."geo_citation_kind" AS ENUM('owned', 'earned');
--> statement-breakpoint
CREATE TABLE "geo_query_sets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"purpose" text DEFAULT 'commercial_baseline' NOT NULL,
	"status" "geo_query_set_status" DEFAULT 'active' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"market" text DEFAULT '' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_queries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"set_id" uuid NOT NULL,
	"query" text NOT NULL,
	"group" "geo_query_group" NOT NULL,
	"source_kind" "geo_query_source_kind" NOT NULL,
	"source_id" uuid NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_measurement_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"set_id" uuid NOT NULL,
	"method" "geo_measurement_method" NOT NULL,
	"status" "geo_run_status" DEFAULT 'recorded' NOT NULL,
	"cost_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_engine_observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"query_id" uuid NOT NULL,
	"engine" "geo_surface" NOT NULL,
	"method" "geo_measurement_method" NOT NULL,
	"evidence_class" "seo_evidence_class" DEFAULT 'observed' NOT NULL,
	"mentioned" boolean DEFAULT false NOT NULL,
	"owned_citation" boolean DEFAULT false NOT NULL,
	"earned_citation" boolean DEFAULT false NOT NULL,
	"represented" boolean DEFAULT false NOT NULL,
	"accurate" "geo_accuracy" DEFAULT 'unknown' NOT NULL,
	"prominence" "geo_prominence" DEFAULT 'unknown' NOT NULL,
	"referral_observed" boolean DEFAULT false NOT NULL,
	"outcome_observed" boolean DEFAULT false NOT NULL,
	"confidence" integer DEFAULT 50 NOT NULL,
	"detail" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_citations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"observation_id" uuid NOT NULL,
	"kind" "geo_citation_kind" NOT NULL,
	"url" text,
	"domain" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_query_sets" ADD CONSTRAINT "geo_query_sets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_query_sets" ADD CONSTRAINT "geo_query_sets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_queries" ADD CONSTRAINT "geo_queries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_queries" ADD CONSTRAINT "geo_queries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_queries" ADD CONSTRAINT "geo_queries_set_id_geo_query_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."geo_query_sets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_measurement_runs" ADD CONSTRAINT "geo_measurement_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_measurement_runs" ADD CONSTRAINT "geo_measurement_runs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_measurement_runs" ADD CONSTRAINT "geo_measurement_runs_set_id_geo_query_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."geo_query_sets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_engine_observations" ADD CONSTRAINT "geo_engine_observations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_engine_observations" ADD CONSTRAINT "geo_engine_observations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_engine_observations" ADD CONSTRAINT "geo_engine_observations_run_id_geo_measurement_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."geo_measurement_runs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_engine_observations" ADD CONSTRAINT "geo_engine_observations_query_id_geo_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."geo_queries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_citations" ADD CONSTRAINT "geo_citations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_citations" ADD CONSTRAINT "geo_citations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_citations" ADD CONSTRAINT "geo_citations_observation_id_geo_engine_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."geo_engine_observations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "geo_query_sets_client_slug_idx" ON "geo_query_sets" USING btree ("client_id","slug");
--> statement-breakpoint
CREATE INDEX "geo_query_sets_client_idx" ON "geo_query_sets" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "geo_queries_client_set_query_locale_idx" ON "geo_queries" USING btree ("client_id","set_id","query","locale");
--> statement-breakpoint
CREATE INDEX "geo_queries_client_idx" ON "geo_queries" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "geo_measurement_runs_client_idx" ON "geo_measurement_runs" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "geo_engine_observations_client_idx" ON "geo_engine_observations" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "geo_engine_observations_client_observed_idx" ON "geo_engine_observations" USING btree ("client_id","observed_at");
--> statement-breakpoint
CREATE INDEX "geo_citations_client_idx" ON "geo_citations" USING btree ("client_id");
