CREATE TABLE "creative_compositions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"template_key" text NOT NULL,
	"schema_version" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"headline" text NOT NULL,
	"copy_snapshot" jsonb NOT NULL,
	"token_snapshot" jsonb NOT NULL,
	"has_logo" boolean DEFAULT false NOT NULL,
	"source_logo_asset_id" uuid,
	"storage_key" text NOT NULL,
	"mime_type" text DEFAULT 'image/svg+xml' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_compositions" ADD CONSTRAINT "creative_compositions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_compositions" ADD CONSTRAINT "creative_compositions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_compositions" ADD CONSTRAINT "creative_compositions_source_logo_asset_id_brand_assets_id_fk" FOREIGN KEY ("source_logo_asset_id") REFERENCES "public"."brand_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "creative_compositions_client_kind_version_idx" ON "creative_compositions" USING btree ("client_id","kind","version");
--> statement-breakpoint
CREATE INDEX "creative_compositions_client_idx" ON "creative_compositions" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "creative_compositions_org_idx" ON "creative_compositions" USING btree ("organization_id");
