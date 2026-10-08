CREATE TABLE "ask_vector_turns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"intent" text NOT NULL,
	"tool_name" text NOT NULL,
	"authorized" boolean NOT NULL,
	"evidence_class" text NOT NULL,
	"answer" text NOT NULL,
	"explanation" text,
	"cost_micros" integer,
	"asked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ask_vector_turns" ADD CONSTRAINT "ask_vector_turns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ask_vector_turns" ADD CONSTRAINT "ask_vector_turns_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ask_vector_turns" ADD CONSTRAINT "ask_vector_turns_intent_check" CHECK (
	"intent" IN ('goal_blocker', 'qualified_leads', 'source_coverage', 'recorded_revenue', 'data_health')
	AND "evidence_class" IN ('observed', 'measured', 'inferred', 'estimated', 'unknown')
);
--> statement-breakpoint
CREATE INDEX "ask_vector_turns_client_idx" ON "ask_vector_turns" USING btree ("client_id");
