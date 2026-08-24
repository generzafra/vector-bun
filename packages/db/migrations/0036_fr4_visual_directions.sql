CREATE TABLE "visual_directions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"page_version_id" uuid NOT NULL,
	"candidate_index" integer NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'scored' NOT NULL,
	"source" text DEFAULT 'deterministic' NOT NULL,
	"manifest" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"selected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_candidate_scores" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"visual_direction_id" uuid NOT NULL,
	"score_total" integer NOT NULL,
	"dimensions" jsonb NOT NULL,
	"scoring_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visual_directions" ADD CONSTRAINT "visual_directions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "visual_directions" ADD CONSTRAINT "visual_directions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "visual_directions" ADD CONSTRAINT "visual_directions_page_version_id_page_versions_id_fk" FOREIGN KEY ("page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "page_candidate_scores" ADD CONSTRAINT "page_candidate_scores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "page_candidate_scores" ADD CONSTRAINT "page_candidate_scores_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "page_candidate_scores" ADD CONSTRAINT "page_candidate_scores_visual_direction_id_visual_directions_id_fk" FOREIGN KEY ("visual_direction_id") REFERENCES "public"."visual_directions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "visual_directions_client_version_idx" ON "visual_directions" USING btree ("client_id","page_version_id","candidate_index");
--> statement-breakpoint
CREATE INDEX "visual_directions_client_idx" ON "visual_directions" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "visual_directions_org_idx" ON "visual_directions" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "page_candidate_scores_client_direction_idx" ON "page_candidate_scores" USING btree ("client_id","visual_direction_id");
--> statement-breakpoint
CREATE INDEX "page_candidate_scores_client_idx" ON "page_candidate_scores" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "page_candidate_scores_org_idx" ON "page_candidate_scores" USING btree ("organization_id");
