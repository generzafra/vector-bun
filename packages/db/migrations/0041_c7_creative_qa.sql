CREATE TABLE "creative_qa_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"page_version_id" uuid NOT NULL,
	"creative_asset_id" uuid,
	"checks" jsonb NOT NULL,
	"passed" boolean NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"summary" text NOT NULL,
	"alt_text" text,
	"revision_note" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_qa_reviews" ADD CONSTRAINT "creative_qa_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_qa_reviews" ADD CONSTRAINT "creative_qa_reviews_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_qa_reviews" ADD CONSTRAINT "creative_qa_reviews_page_version_id_page_versions_id_fk" FOREIGN KEY ("page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_qa_reviews" ADD CONSTRAINT "creative_qa_reviews_creative_asset_id_creative_assets_id_fk" FOREIGN KEY ("creative_asset_id") REFERENCES "public"."creative_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "creative_qa_reviews_client_version_idx" ON "creative_qa_reviews" USING btree ("client_id","page_version_id");
--> statement-breakpoint
CREATE INDEX "creative_qa_reviews_client_idx" ON "creative_qa_reviews" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "creative_qa_reviews_org_idx" ON "creative_qa_reviews" USING btree ("organization_id");
