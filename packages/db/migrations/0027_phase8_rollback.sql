ALTER TYPE "public"."ai_action_execution_status" ADD VALUE IF NOT EXISTS 'rolled_back';
--> statement-breakpoint
ALTER TABLE "ai_action_executions" ADD COLUMN "rolled_back_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "ai_action_policies"
SET
	"description" = 'Level 4 conditional. Phase 7 policy still decides. Kill switch wins. Confidence cannot authorize.',
	"default_autonomy" = 4,
	"max_autonomy" = 4,
	"auto_execute_allowed" = true,
	"approval_expiry_seconds" = 86400,
	"updated_at" = now()
WHERE "action_type" = 'experiment.promote_winner';
