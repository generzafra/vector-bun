CREATE TABLE "client_value_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"package_name" text NOT NULL,
	"fee_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"recorded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "value_activity_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"automated" boolean DEFAULT false NOT NULL,
	"client_visible" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_value_profiles" ADD CONSTRAINT "client_value_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_value_profiles" ADD CONSTRAINT "client_value_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "value_activity_records" ADD CONSTRAINT "value_activity_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "value_activity_records" ADD CONSTRAINT "value_activity_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "client_value_profiles_client_idx" ON "client_value_profiles" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "client_value_profiles_org_idx" ON "client_value_profiles" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "value_activity_records_client_idx" ON "value_activity_records" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "value_activity_records_client_completed_idx" ON "value_activity_records" USING btree ("client_id","completed_at");
--> statement-breakpoint
CREATE INDEX "value_activity_records_org_idx" ON "value_activity_records" USING btree ("organization_id");
