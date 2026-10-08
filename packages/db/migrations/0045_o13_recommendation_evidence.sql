CREATE TABLE "recommendation_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"evidence_type" text NOT NULL,
	"source_reference" text NOT NULL,
	"metric_name" text NOT NULL,
	"metric_value" text,
	"comparison_value" text,
	"confidence" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recommendation_evidence" ADD CONSTRAINT "recommendation_evidence_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recommendation_evidence" ADD CONSTRAINT "recommendation_evidence_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recommendation_evidence" ADD CONSTRAINT "recommendation_evidence_recommendation_id_ai_decisions_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."ai_decisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recommendation_evidence" ADD CONSTRAINT "recommendation_evidence_evidence_type_check" CHECK ("evidence_type" IN ('observed', 'measured', 'inferred', 'estimated', 'unknown'));
--> statement-breakpoint
CREATE INDEX "recommendation_evidence_client_idx" ON "recommendation_evidence" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "recommendation_evidence_recommendation_idx" ON "recommendation_evidence" USING btree ("client_id","recommendation_id");
