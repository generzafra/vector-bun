CREATE TABLE "creative_derivatives" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"page_version_id" uuid NOT NULL,
	"source_asset_id" uuid,
	"slot" text NOT NULL,
	"width_px" integer NOT NULL,
	"focal_x" integer NOT NULL,
	"focal_y" integer NOT NULL,
	"alt_text" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creative_derivatives_slot_check" CHECK ("slot" IN ('hero')),
	CONSTRAINT "creative_derivatives_width_check" CHECK ("width_px" IN (640, 960, 1440)),
	CONSTRAINT "creative_derivatives_focal_x_check" CHECK ("focal_x" BETWEEN 0 AND 10000),
	CONSTRAINT "creative_derivatives_focal_y_check" CHECK ("focal_y" BETWEEN 0 AND 10000),
	CONSTRAINT "creative_derivatives_status_check" CHECK ("status" IN ('planned'))
);
--> statement-breakpoint
ALTER TABLE "creative_derivatives" ADD CONSTRAINT "creative_derivatives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_derivatives" ADD CONSTRAINT "creative_derivatives_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_derivatives" ADD CONSTRAINT "creative_derivatives_page_version_id_page_versions_id_fk" FOREIGN KEY ("page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_derivatives" ADD CONSTRAINT "creative_derivatives_source_asset_id_creative_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."creative_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "creative_derivatives_client_version_width_idx" ON "creative_derivatives" USING btree ("client_id","page_version_id","width_px");
--> statement-breakpoint
CREATE INDEX "creative_derivatives_client_idx" ON "creative_derivatives" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "creative_derivatives_org_idx" ON "creative_derivatives" USING btree ("organization_id");
