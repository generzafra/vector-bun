CREATE TABLE "asset_sufficiency_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"page_version_id" uuid NOT NULL,
	"dimensions" jsonb NOT NULL,
	"overall_score" integer NOT NULL,
	"media_strategy" text NOT NULL,
	"industry_visual_dependency" text DEFAULT 'medium' NOT NULL,
	"profile_confirmed" boolean DEFAULT false NOT NULL,
	"logo_asset_id" uuid,
	"summary_client" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_sufficiency_snapshots" ADD CONSTRAINT "asset_sufficiency_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "asset_sufficiency_snapshots" ADD CONSTRAINT "asset_sufficiency_snapshots_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "asset_sufficiency_snapshots" ADD CONSTRAINT "asset_sufficiency_snapshots_page_version_id_page_versions_id_fk" FOREIGN KEY ("page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "asset_sufficiency_snapshots" ADD CONSTRAINT "asset_sufficiency_snapshots_logo_asset_id_brand_assets_id_fk" FOREIGN KEY ("logo_asset_id") REFERENCES "public"."brand_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "asset_sufficiency_snapshots_client_version_idx" ON "asset_sufficiency_snapshots" USING btree ("client_id","page_version_id");
--> statement-breakpoint
CREATE INDEX "asset_sufficiency_snapshots_client_idx" ON "asset_sufficiency_snapshots" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "asset_sufficiency_snapshots_org_idx" ON "asset_sufficiency_snapshots" USING btree ("organization_id");
