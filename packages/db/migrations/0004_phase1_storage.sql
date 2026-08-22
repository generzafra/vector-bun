CREATE TYPE "public"."brand_asset_purpose" AS ENUM('logo', 'mark', 'og', 'favicon', 'other');
--> statement-breakpoint
CREATE TABLE "brand_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"purpose" "brand_asset_purpose" NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "brand_assets_client_key_idx" ON "brand_assets" USING btree ("client_id","storage_key");
--> statement-breakpoint
CREATE INDEX "brand_assets_client_idx" ON "brand_assets" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "brand_assets_org_idx" ON "brand_assets" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
