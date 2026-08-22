CREATE TYPE "public"."creative_asset_status" AS ENUM('draft', 'approved', 'archived');
--> statement-breakpoint
CREATE TYPE "public"."creative_asset_kind" AS ENUM('image', 'graphic', 'other');
--> statement-breakpoint
CREATE TYPE "public"."creative_rights_status" AS ENUM('unknown', 'client_owned', 'client_approved', 'restricted', 'prohibited');
--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('linkedin', 'x');
--> statement-breakpoint
CREATE TYPE "public"."social_connection_status" AS ENUM('pending', 'active', 'expired', 'revoked');
--> statement-breakpoint
CREATE TYPE "public"."social_account_status" AS ENUM('active', 'disconnected');
--> statement-breakpoint
CREATE TYPE "public"."social_post_status" AS ENUM('idea', 'draft', 'reviewed', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'archived');
--> statement-breakpoint
CREATE TYPE "public"."social_publication_status" AS ENUM('queued', 'publishing', 'published', 'failed');
--> statement-breakpoint
CREATE TABLE "creative_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" "creative_asset_kind" DEFAULT 'image' NOT NULL,
	"status" "creative_asset_status" DEFAULT 'draft' NOT NULL,
	"source_type" text DEFAULT 'operator_upload' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_asset_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_asset_rights" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"rights_status" "creative_rights_status" DEFAULT 'unknown' NOT NULL,
	"usage_notes" text,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"status" "social_connection_status" DEFAULT 'pending' NOT NULL,
	"encrypted_access_token" text,
	"encrypted_refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text,
	"last_validated_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"external_account_id" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"status" "social_account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "social_post_status" DEFAULT 'draft' NOT NULL,
	"body" text NOT NULL,
	"asset_id" uuid,
	"asset_version_id" uuid,
	"scheduled_at" timestamp with time zone,
	"similarity_hash" text NOT NULL,
	"created_by" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_publications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"status" "social_publication_status" DEFAULT 'queued' NOT NULL,
	"provider_post_id" text,
	"content_version" integer DEFAULT 1 NOT NULL,
	"asset_version_id" uuid,
	"idempotency_key" text NOT NULL,
	"error" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_metrics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"publication_id" uuid NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_provider_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"provider_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_assets" ADD CONSTRAINT "creative_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_assets" ADD CONSTRAINT "creative_assets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_asset_versions" ADD CONSTRAINT "creative_asset_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_asset_versions" ADD CONSTRAINT "creative_asset_versions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_asset_versions" ADD CONSTRAINT "creative_asset_versions_asset_id_creative_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."creative_assets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_asset_rights" ADD CONSTRAINT "creative_asset_rights_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_asset_rights" ADD CONSTRAINT "creative_asset_rights_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_asset_rights" ADD CONSTRAINT "creative_asset_rights_asset_id_creative_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."creative_assets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_connection_id_social_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_asset_id_creative_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."creative_assets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_asset_version_id_creative_asset_versions_id_fk" FOREIGN KEY ("asset_version_id") REFERENCES "public"."creative_asset_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_account_id_social_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."social_accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_connection_id_social_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_asset_version_id_creative_asset_versions_id_fk" FOREIGN KEY ("asset_version_id") REFERENCES "public"."creative_asset_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_metrics" ADD CONSTRAINT "social_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_metrics" ADD CONSTRAINT "social_metrics_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_metrics" ADD CONSTRAINT "social_metrics_publication_id_social_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."social_publications"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_provider_events" ADD CONSTRAINT "social_provider_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_provider_events" ADD CONSTRAINT "social_provider_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "creative_assets_client_idx" ON "creative_assets" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "creative_assets_org_idx" ON "creative_assets" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "creative_asset_versions_unique_idx" ON "creative_asset_versions" USING btree ("asset_id","version");
--> statement-breakpoint
CREATE UNIQUE INDEX "creative_asset_versions_client_key_idx" ON "creative_asset_versions" USING btree ("client_id","storage_key");
--> statement-breakpoint
CREATE INDEX "creative_asset_versions_client_idx" ON "creative_asset_versions" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "creative_asset_rights_asset_idx" ON "creative_asset_rights" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX "creative_asset_rights_client_idx" ON "creative_asset_rights" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "social_connections_client_platform_idx" ON "social_connections" USING btree ("client_id","platform");
--> statement-breakpoint
CREATE INDEX "social_connections_client_idx" ON "social_connections" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "social_accounts_connection_idx" ON "social_accounts" USING btree ("connection_id");
--> statement-breakpoint
CREATE INDEX "social_accounts_client_idx" ON "social_accounts" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "social_posts_client_idx" ON "social_posts" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "social_posts_client_status_idx" ON "social_posts" USING btree ("client_id","status");
--> statement-breakpoint
CREATE INDEX "social_posts_similarity_idx" ON "social_posts" USING btree ("client_id","similarity_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "social_publications_idempotency_idx" ON "social_publications" USING btree ("client_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX "social_publications_client_idx" ON "social_publications" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "social_publications_post_idx" ON "social_publications" USING btree ("post_id");
--> statement-breakpoint
CREATE INDEX "social_metrics_client_idx" ON "social_metrics" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "social_metrics_publication_idx" ON "social_metrics" USING btree ("publication_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "social_provider_events_unique_idx" ON "social_provider_events" USING btree ("client_id","provider_event_id");
--> statement-breakpoint
CREATE INDEX "social_provider_events_client_idx" ON "social_provider_events" USING btree ("client_id");
