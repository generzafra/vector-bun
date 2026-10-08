CREATE TABLE "client_value_baselines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"evidence" text NOT NULL,
	"label" text NOT NULL,
	"recorded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_value_baselines_amount_check" CHECK ("amount_minor" > 0),
	CONSTRAINT "client_value_baselines_version_check" CHECK ("version" >= 1),
	CONSTRAINT "client_value_baselines_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "client_value_baselines_evidence_check" CHECK ("evidence" = 'client_confirmed'),
	CONSTRAINT "client_value_baselines_label_check" CHECK ("label" = 'estimated')
);
--> statement-breakpoint
ALTER TABLE "client_value_baselines" ADD CONSTRAINT "client_value_baselines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_value_baselines" ADD CONSTRAINT "client_value_baselines_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "client_value_baselines_client_version_idx" ON "client_value_baselines" USING btree ("client_id","version");
--> statement-breakpoint
CREATE INDEX "client_value_baselines_client_idx" ON "client_value_baselines" USING btree ("client_id");
