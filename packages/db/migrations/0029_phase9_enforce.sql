ALTER TABLE "tenant_usage_limits" ALTER COLUMN "mode" SET DEFAULT 'enforce';
--> statement-breakpoint
UPDATE "tenant_usage_limits" SET "mode" = 'enforce', "updated_at" = now() WHERE "override_reason" IS NULL;
