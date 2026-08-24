CREATE TABLE "funnel_asset_manifests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"page_version_id" uuid NOT NULL,
	"schema_version" text NOT NULL,
	"og_composition_id" uuid,
	"social_composition_id" uuid,
	"email_composition_id" uuid,
	"placed_at" timestamp with time zone NOT NULL,
	"placed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funnel_asset_manifests" ADD CONSTRAINT "funnel_asset_manifests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "funnel_asset_manifests" ADD CONSTRAINT "funnel_asset_manifests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "funnel_asset_manifests" ADD CONSTRAINT "funnel_asset_manifests_page_version_id_page_versions_id_fk" FOREIGN KEY ("page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "funnel_asset_manifests" ADD CONSTRAINT "funnel_asset_manifests_og_composition_id_creative_compositions_id_fk" FOREIGN KEY ("og_composition_id") REFERENCES "public"."creative_compositions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "funnel_asset_manifests" ADD CONSTRAINT "funnel_asset_manifests_social_composition_id_creative_compositions_id_fk" FOREIGN KEY ("social_composition_id") REFERENCES "public"."creative_compositions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "funnel_asset_manifests" ADD CONSTRAINT "funnel_asset_manifests_email_composition_id_creative_compositions_id_fk" FOREIGN KEY ("email_composition_id") REFERENCES "public"."creative_compositions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "funnel_asset_manifests_client_version_idx" ON "funnel_asset_manifests" USING btree ("client_id","page_version_id");
--> statement-breakpoint
CREATE INDEX "funnel_asset_manifests_client_idx" ON "funnel_asset_manifests" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "funnel_asset_manifests_org_idx" ON "funnel_asset_manifests" USING btree ("organization_id");
