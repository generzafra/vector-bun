CREATE TYPE "public"."domain_kind" AS ENUM('preview', 'production', 'redirect');
--> statement-breakpoint
CREATE TYPE "public"."domain_status" AS ENUM('pending', 'verified', 'active', 'disabled');
--> statement-breakpoint
CREATE TYPE "public"."page_version_status" AS ENUM('draft', 'published');
--> statement-breakpoint
CREATE TABLE "client_domains" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"kind" "domain_kind" NOT NULL,
	"status" "domain_status" DEFAULT 'pending' NOT NULL,
	"is_canonical" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "client_domains_hostname_idx" ON "client_domains" USING btree ("hostname");
--> statement-breakpoint
CREATE INDEX "client_domains_client_idx" ON "client_domains" USING btree ("client_id");
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sites_client_idx" ON "sites" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "sites_org_idx" ON "sites" USING btree ("organization_id");
--> statement-breakpoint
CREATE TABLE "funnels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"purpose" text DEFAULT 'lead' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "funnels_client_slug_idx" ON "funnels" USING btree ("client_id","slug");
--> statement-breakpoint
CREATE INDEX "funnels_client_idx" ON "funnels" USING btree ("client_id");
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"funnel_id" uuid NOT NULL,
	"path" text DEFAULT '/' NOT NULL,
	"title" text NOT NULL,
	"published_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pages_funnel_path_idx" ON "pages" USING btree ("funnel_id","path");
--> statement-breakpoint
CREATE INDEX "pages_client_idx" ON "pages" USING btree ("client_id");
--> statement-breakpoint
CREATE TABLE "page_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "page_version_status" NOT NULL,
	"document" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "page_versions_page_version_idx" ON "page_versions" USING btree ("page_id","version");
--> statement-breakpoint
CREATE INDEX "page_versions_client_idx" ON "page_versions" USING btree ("client_id");
--> statement-breakpoint
ALTER TABLE "client_domains" ADD CONSTRAINT "client_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_domains" ADD CONSTRAINT "client_domains_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
