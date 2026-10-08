CREATE TYPE "public"."offer_type" AS ENUM('consultation', 'package', 'promotion', 'other');
--> statement-breakpoint
CREATE TABLE "offer_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"offer_type" "offer_type" NOT NULL,
	"service_id" uuid,
	"price_minor" integer,
	"discount_minor" integer,
	"currency" text NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"eligibility" text,
	"terms" text,
	"primary_cta" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "offer_versions_client_offer_version_idx" ON "offer_versions" USING btree ("client_id","offer_id","version");
--> statement-breakpoint
CREATE INDEX "offer_versions_client_idx" ON "offer_versions" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "offer_versions_offer_idx" ON "offer_versions" USING btree ("offer_id");
