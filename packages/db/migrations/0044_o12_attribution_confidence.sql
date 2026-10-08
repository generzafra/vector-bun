ALTER TABLE "attribution_results" ADD COLUMN "evidence_class" text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
UPDATE "attribution_results"
SET "evidence_class" = CASE
	WHEN "last_non_direct_campaign" IS NOT NULL AND btrim("last_non_direct_campaign") <> '' THEN 'measured'
	WHEN btrim("last_non_direct_channel") <> '' AND btrim("last_non_direct_channel") <> 'direct' THEN 'observed'
	WHEN btrim("last_non_direct_channel") = 'direct' THEN 'inferred'
	ELSE 'unknown'
END;
--> statement-breakpoint
ALTER TABLE "attribution_results" ADD CONSTRAINT "attribution_results_evidence_class_check" CHECK ("evidence_class" IN ('observed', 'measured', 'inferred', 'estimated', 'unknown'));
