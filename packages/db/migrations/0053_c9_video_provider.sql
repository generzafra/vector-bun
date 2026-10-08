ALTER TYPE "creative_asset_kind" ADD VALUE IF NOT EXISTS 'video';
--> statement-breakpoint
CREATE TABLE "video_generation_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text NOT NULL,
	"mode" text NOT NULL,
	"title" text NOT NULL,
	"prompt_text" text NOT NULL,
	"prompt_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"duration_seconds" integer NOT NULL,
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
	"source_asset_id" uuid,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_generation_jobs_status_check" CHECK ("status" IN ('succeeded', 'failed', 'denied')),
	CONSTRAINT "video_generation_jobs_mode_check" CHECK ("mode" IN ('generate', 'image_to_video')),
	CONSTRAINT "video_generation_jobs_duration_check" CHECK ("duration_seconds" >= 1 AND "duration_seconds" <= 15)
);
--> statement-breakpoint
ALTER TABLE "video_generation_jobs" ADD CONSTRAINT "video_generation_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "video_generation_jobs" ADD CONSTRAINT "video_generation_jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "video_generation_jobs" ADD CONSTRAINT "video_generation_jobs_creative_asset_id_creative_assets_id_fk" FOREIGN KEY ("creative_asset_id") REFERENCES "public"."creative_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "video_generation_jobs" ADD CONSTRAINT "video_generation_jobs_source_asset_id_creative_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."creative_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "video_generation_jobs_client_idempotency_idx" ON "video_generation_jobs" USING btree ("client_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX "video_generation_jobs_client_idx" ON "video_generation_jobs" USING btree ("client_id");
