CREATE TABLE "image_generation_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text NOT NULL,
	"purpose" text DEFAULT 'supporting' NOT NULL,
	"title" text NOT NULL,
	"prompt_text" text NOT NULL,
	"prompt_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"adapter" text NOT NULL,
	"model" text NOT NULL,
	"provider_request_id" text,
	"idempotency_key" text NOT NULL,
	"cost_micros" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"deny_reason" text,
	"error" text,
	"storage_key" text,
	"creative_asset_id" uuid,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "image_generation_jobs" ADD CONSTRAINT "image_generation_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "image_generation_jobs" ADD CONSTRAINT "image_generation_jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "image_generation_jobs" ADD CONSTRAINT "image_generation_jobs_creative_asset_id_creative_assets_id_fk" FOREIGN KEY ("creative_asset_id") REFERENCES "public"."creative_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "image_generation_jobs_client_idempotency_idx" ON "image_generation_jobs" USING btree ("client_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX "image_generation_jobs_client_idx" ON "image_generation_jobs" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "image_generation_jobs_org_idx" ON "image_generation_jobs" USING btree ("organization_id");
