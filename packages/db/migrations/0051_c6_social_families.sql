ALTER TABLE "creative_assets" ADD COLUMN "family_key" text;
--> statement-breakpoint
ALTER TABLE "creative_assets" ADD COLUMN "channel" text;
--> statement-breakpoint
ALTER TABLE "creative_assets" ADD CONSTRAINT "creative_assets_family_check" CHECK (
	("family_key" IS NULL AND "channel" IS NULL)
	OR (
		"family_key" IS NOT NULL
		AND char_length("family_key") BETWEEN 2 AND 40
		AND "family_key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
		AND "channel" IN ('linkedin', 'x', 'facebook', 'instagram')
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "creative_assets_client_family_channel_idx" ON "creative_assets" USING btree ("client_id","family_key","channel");
