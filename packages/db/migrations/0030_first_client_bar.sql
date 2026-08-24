CREATE TYPE "public"."client_goal_type" AS ENUM('qualified_leads', 'sales', 'revenue', 'bookings', 'appointments', 'custom');
--> statement-breakpoint
CREATE TYPE "public"."client_goal_period" AS ENUM('month', 'quarter', 'year');
--> statement-breakpoint
CREATE TYPE "public"."client_goal_status" AS ENUM('active', 'paused', 'completed');
--> statement-breakpoint
CREATE TYPE "public"."data_health_status" AS ENUM('healthy', 'warning', 'broken', 'unknown');
--> statement-breakpoint
CREATE TABLE "client_goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"goal_type" "client_goal_type" NOT NULL,
	"target_value" integer NOT NULL,
	"unit" text NOT NULL,
	"currency" text,
	"period" "client_goal_period" NOT NULL,
	"baseline_value" integer,
	"is_primary" boolean DEFAULT false NOT NULL,
	"start_on" timestamp with time zone,
	"end_on" timestamp with time zone,
	"data_source" text,
	"status" "client_goal_status" DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "first_reveal_gate_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"page_version_id" uuid NOT NULL,
	"gate_version" integer DEFAULT 1 NOT NULL,
	"passed" boolean NOT NULL,
	"checks" jsonb NOT NULL,
	"override_reason" text,
	"overridden_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_health_checks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"check_key" text NOT NULL,
	"status" "data_health_status" NOT NULL,
	"detail" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_notification_preferences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_goals" ADD CONSTRAINT "client_goals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_goals" ADD CONSTRAINT "client_goals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "first_reveal_gate_results" ADD CONSTRAINT "first_reveal_gate_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "first_reveal_gate_results" ADD CONSTRAINT "first_reveal_gate_results_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "first_reveal_gate_results" ADD CONSTRAINT "first_reveal_gate_results_page_version_id_page_versions_id_fk" FOREIGN KEY ("page_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "data_health_checks" ADD CONSTRAINT "data_health_checks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "data_health_checks" ADD CONSTRAINT "data_health_checks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_notification_preferences" ADD CONSTRAINT "client_notification_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_notification_preferences" ADD CONSTRAINT "client_notification_preferences_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "client_goals_client_idx" ON "client_goals" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "client_goals_one_primary_idx" ON "client_goals" USING btree ("client_id") WHERE "is_primary" = true;
--> statement-breakpoint
CREATE UNIQUE INDEX "first_reveal_gate_results_client_version_idx" ON "first_reveal_gate_results" USING btree ("client_id", "page_version_id");
--> statement-breakpoint
CREATE INDEX "first_reveal_gate_results_client_idx" ON "first_reveal_gate_results" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "data_health_checks_client_key_idx" ON "data_health_checks" USING btree ("client_id", "check_key");
--> statement-breakpoint
CREATE INDEX "data_health_checks_client_idx" ON "data_health_checks" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "client_notification_preferences_client_topic_idx" ON "client_notification_preferences" USING btree ("client_id", "topic");
--> statement-breakpoint
CREATE INDEX "client_notification_preferences_client_idx" ON "client_notification_preferences" USING btree ("client_id");
