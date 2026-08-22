ALTER TABLE "client_settings" ADD COLUMN "jurisdiction_profile" text DEFAULT 'us_can_spam' NOT NULL;
--> statement-breakpoint
CREATE TYPE "public"."email_connection_status" AS ENUM('active', 'paused');
--> statement-breakpoint
CREATE TYPE "public"."email_domain_status" AS ENUM('pending', 'ready', 'failed');
--> statement-breakpoint
CREATE TYPE "public"."email_sequence_status" AS ENUM('draft', 'approved', 'retired');
--> statement-breakpoint
CREATE TYPE "public"."email_enrollment_status" AS ENUM('active', 'completed', 'cancelled', 'suppressed');
--> statement-breakpoint
CREATE TYPE "public"."email_message_status" AS ENUM('queued', 'sent', 'delivered', 'bounced', 'complained', 'skipped', 'failed');
--> statement-breakpoint
CREATE TYPE "public"."email_suppression_scope" AS ENUM('global', 'client');
--> statement-breakpoint
CREATE TYPE "public"."email_suppression_reason" AS ENUM('unsubscribe', 'bounce', 'complaint', 'operator');
--> statement-breakpoint
CREATE TABLE "email_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"status" "email_connection_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_domains" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"from_address" text NOT NULL,
	"from_name" text NOT NULL,
	"from_approved" boolean DEFAULT false NOT NULL,
	"dkim_selector" text DEFAULT 'resend' NOT NULL,
	"status" "email_domain_status" DEFAULT 'pending' NOT NULL,
	"spf_ready" boolean DEFAULT false NOT NULL,
	"dkim_ready" boolean DEFAULT false NOT NULL,
	"dmarc_ready" boolean DEFAULT false NOT NULL,
	"check_detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_topics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"email" text NOT NULL,
	"topic_preferences" jsonb DEFAULT '{"welcome":true}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"status" "email_sequence_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequence_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"sequence_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"topic" text DEFAULT 'welcome' NOT NULL,
	"subject" text NOT NULL,
	"text_body" text NOT NULL,
	"html_body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequence_enrollments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"sequence_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"email" text NOT NULL,
	"status" "email_enrollment_status" DEFAULT 'active' NOT NULL,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"next_step_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"lead_id" uuid,
	"enrollment_id" uuid,
	"sequence_id" uuid,
	"step_index" integer,
	"to_address" text NOT NULL,
	"from_address" text NOT NULL,
	"subject" text NOT NULL,
	"status" "email_message_status" DEFAULT 'queued' NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_message_id" text,
	"idempotency_key" text NOT NULL,
	"skip_reason" text,
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"provider_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"client_id" uuid,
	"email" text NOT NULL,
	"scope" "email_suppression_scope" NOT NULL,
	"reason" "email_suppression_reason" NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"decision" "consent_decision" NOT NULL,
	"source" text NOT NULL,
	"copy_version" integer NOT NULL,
	"request_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_connections_client_idx" ON "email_connections" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_domains_client_domain_idx" ON "email_domains" USING btree ("client_id", "domain");
--> statement-breakpoint
CREATE INDEX "email_domains_client_idx" ON "email_domains" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_topics_client_slug_idx" ON "email_topics" USING btree ("client_id", "slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_contacts_client_email_idx" ON "email_contacts" USING btree ("client_id", "email");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_contacts_contact_idx" ON "email_contacts" USING btree ("contact_id");
--> statement-breakpoint
CREATE INDEX "email_contacts_client_idx" ON "email_contacts" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_sequences_client_key_idx" ON "email_sequences" USING btree ("client_id", "key");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_sequence_steps_unique_idx" ON "email_sequence_steps" USING btree ("sequence_id", "step_index");
--> statement-breakpoint
CREATE INDEX "email_sequence_steps_client_idx" ON "email_sequence_steps" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_enrollments_lead_sequence_idx" ON "email_sequence_enrollments" USING btree ("lead_id", "sequence_id");
--> statement-breakpoint
CREATE INDEX "email_enrollments_client_idx" ON "email_sequence_enrollments" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "email_enrollments_due_idx" ON "email_sequence_enrollments" USING btree ("client_id", "status", "next_step_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_messages_idempotency_idx" ON "email_messages" USING btree ("client_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX "email_messages_client_idx" ON "email_messages" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "email_messages_provider_idx" ON "email_messages" USING btree ("provider_message_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_events_provider_idx" ON "email_events" USING btree ("client_id", "provider_event_id");
--> statement-breakpoint
CREATE INDEX "email_events_client_idx" ON "email_events" USING btree ("client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_suppressions_global_email_idx" ON "email_suppressions" USING btree ("email") WHERE "scope" = 'global';
--> statement-breakpoint
CREATE UNIQUE INDEX "email_suppressions_client_email_idx" ON "email_suppressions" USING btree ("client_id", "email") WHERE "scope" = 'client';
--> statement-breakpoint
CREATE INDEX "email_suppressions_client_idx" ON "email_suppressions" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "email_suppressions_email_idx" ON "email_suppressions" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "consent_events_client_idx" ON "consent_events" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "consent_events_contact_idx" ON "consent_events" USING btree ("contact_id");
--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_domains" ADD CONSTRAINT "email_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_domains" ADD CONSTRAINT "email_domains_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_topics" ADD CONSTRAINT "email_topics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_topics" ADD CONSTRAINT "email_topics_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_contacts" ADD CONSTRAINT "email_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_contacts" ADD CONSTRAINT "email_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_contacts" ADD CONSTRAINT "email_contacts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequence_steps" ADD CONSTRAINT "email_sequence_steps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequence_steps" ADD CONSTRAINT "email_sequence_steps_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequence_steps" ADD CONSTRAINT "email_sequence_steps_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_enrollment_id_email_sequence_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."email_sequence_enrollments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_message_id_email_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."email_messages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_suppressions" ADD CONSTRAINT "email_suppressions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_suppressions" ADD CONSTRAINT "email_suppressions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
