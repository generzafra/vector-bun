CREATE TYPE "public"."geo_representation_status" AS ENUM('accurate', 'inaccurate', 'unknown', 'missing');
--> statement-breakpoint
CREATE TABLE "geo_visibility_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"set_id" uuid NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"query_count" integer DEFAULT 0 NOT NULL,
	"observation_count" integer DEFAULT 0 NOT NULL,
	"mentioned_query_count" integer DEFAULT 0 NOT NULL,
	"owned_citation_query_count" integer DEFAULT 0 NOT NULL,
	"earned_citation_query_count" integer DEFAULT 0 NOT NULL,
	"represented_query_count" integer DEFAULT 0 NOT NULL,
	"accurate_yes_count" integer DEFAULT 0 NOT NULL,
	"accurate_no_count" integer DEFAULT 0 NOT NULL,
	"mention_only_count" integer DEFAULT 0 NOT NULL,
	"sufficient" boolean DEFAULT false NOT NULL,
	"headline" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_fact_representations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"observation_id" uuid NOT NULL,
	"claim_id" uuid,
	"status" "geo_representation_status" NOT NULL,
	"evidence_class" "seo_evidence_class" DEFAULT 'observed' NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_visibility_snapshots" ADD CONSTRAINT "geo_visibility_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_visibility_snapshots" ADD CONSTRAINT "geo_visibility_snapshots_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_visibility_snapshots" ADD CONSTRAINT "geo_visibility_snapshots_set_id_geo_query_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."geo_query_sets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_fact_representations" ADD CONSTRAINT "geo_fact_representations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_fact_representations" ADD CONSTRAINT "geo_fact_representations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_fact_representations" ADD CONSTRAINT "geo_fact_representations_snapshot_id_geo_visibility_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."geo_visibility_snapshots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_fact_representations" ADD CONSTRAINT "geo_fact_representations_observation_id_geo_engine_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."geo_engine_observations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_fact_representations" ADD CONSTRAINT "geo_fact_representations_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "geo_visibility_snapshots_client_idx" ON "geo_visibility_snapshots" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "geo_visibility_snapshots_client_computed_idx" ON "geo_visibility_snapshots" USING btree ("client_id","computed_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "geo_fact_representations_snapshot_observation_idx" ON "geo_fact_representations" USING btree ("snapshot_id","observation_id");
--> statement-breakpoint
CREATE INDEX "geo_fact_representations_client_idx" ON "geo_fact_representations" USING btree ("client_id");
