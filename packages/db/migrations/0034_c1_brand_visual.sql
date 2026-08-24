CREATE TABLE "brand_visual_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text DEFAULT 'intake' NOT NULL,
	"current_version" integer DEFAULT 0 NOT NULL,
	"primary_logo_asset_id" uuid,
	"primary_color" text,
	"accent_color" text,
	"primary_font" text,
	"visual_personality" text DEFAULT '' NOT NULL,
	"photography_direction" text DEFAULT '' NOT NULL,
	"prohibited_styles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_visual_profile_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"confirmed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_visual_profiles" ADD CONSTRAINT "brand_visual_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brand_visual_profiles" ADD CONSTRAINT "brand_visual_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brand_visual_profiles" ADD CONSTRAINT "brand_visual_profiles_primary_logo_asset_id_brand_assets_id_fk" FOREIGN KEY ("primary_logo_asset_id") REFERENCES "public"."brand_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brand_visual_profile_versions" ADD CONSTRAINT "brand_visual_profile_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brand_visual_profile_versions" ADD CONSTRAINT "brand_visual_profile_versions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brand_visual_profile_versions" ADD CONSTRAINT "brand_visual_profile_versions_profile_id_brand_visual_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."brand_visual_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "brand_visual_profiles_client_idx" ON "brand_visual_profiles" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "brand_visual_profiles_org_idx" ON "brand_visual_profiles" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "brand_visual_profile_versions_unique_idx" ON "brand_visual_profile_versions" USING btree ("profile_id","version");
--> statement-breakpoint
CREATE INDEX "brand_visual_profile_versions_client_idx" ON "brand_visual_profile_versions" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "brand_visual_profile_versions_org_idx" ON "brand_visual_profile_versions" USING btree ("organization_id");
