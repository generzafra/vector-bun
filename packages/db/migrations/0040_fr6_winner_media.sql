ALTER TABLE "image_generation_jobs" ADD COLUMN "visual_direction_id" uuid;
--> statement-breakpoint
ALTER TABLE "image_generation_jobs" ADD CONSTRAINT "image_generation_jobs_visual_direction_id_visual_directions_id_fk" FOREIGN KEY ("visual_direction_id") REFERENCES "public"."visual_directions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "image_generation_jobs_direction_idx" ON "image_generation_jobs" USING btree ("client_id","visual_direction_id");
