ALTER TABLE "creative_qa_reviews" ADD COLUMN "change_categories" text[];
--> statement-breakpoint
ALTER TABLE "creative_qa_reviews" ADD COLUMN "prior_direction_id" uuid;
--> statement-breakpoint
ALTER TABLE "creative_qa_reviews" ADD CONSTRAINT "creative_qa_reviews_prior_direction_id_visual_directions_id_fk" FOREIGN KEY ("prior_direction_id") REFERENCES "public"."visual_directions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_qa_reviews" ADD CONSTRAINT "creative_qa_reviews_categories_check" CHECK (
	"change_categories" IS NULL
	OR "change_categories" <@ ARRAY['headline', 'photos', 'colors', 'length', 'offer', 'other']::text[]
);
