ALTER TABLE "client_domains" ADD COLUMN "verification_token" text;--> statement-breakpoint
ALTER TABLE "client_domains" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "client_domains" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
DROP INDEX IF EXISTS "client_domains_hostname_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "client_domains_hostname_live_idx" ON "client_domains" USING btree ("hostname") WHERE "status" <> 'disabled';
