ALTER TABLE "ai_runs" ADD COLUMN "artifact_kind" text;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "artifact_page_version_id" uuid;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_artifact_page_version_id_page_versions_id_fk" FOREIGN KEY ("artifact_page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_runs_artifact_idx" ON "ai_runs" USING btree ("client_id","artifact_page_version_id");
