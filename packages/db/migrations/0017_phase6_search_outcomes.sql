CREATE TYPE "public"."search_referral_channel" AS ENUM('organic_search', 'generative');
--> statement-breakpoint
CREATE TABLE "geo_referral_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"query_id" uuid,
	"channel" "search_referral_channel" NOT NULL,
	"engine" text NOT NULL,
	"evidence_class" "seo_evidence_class" DEFAULT 'observed' NOT NULL,
	"visit_proven" boolean DEFAULT true NOT NULL,
	"lead_proven" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_referral_events" ADD CONSTRAINT "geo_referral_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_referral_events" ADD CONSTRAINT "geo_referral_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_referral_events" ADD CONSTRAINT "geo_referral_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_referral_events" ADD CONSTRAINT "geo_referral_events_query_id_geo_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."geo_queries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "geo_referral_events_client_lead_idx" ON "geo_referral_events" USING btree ("client_id","lead_id");
--> statement-breakpoint
CREATE INDEX "geo_referral_events_client_idx" ON "geo_referral_events" USING btree ("client_id");
