CREATE TYPE "public"."email_inbound_status" AS ENUM('received', 'reviewed');
--> statement-breakpoint
CREATE TYPE "public"."email_inbound_class" AS ENUM('general', 'legal', 'refund', 'dispute', 'pricing', 'complaint', 'negotiation');
--> statement-breakpoint
CREATE TABLE "email_inbound_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"contact_id" uuid,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"subject" text NOT NULL,
	"text_body" text NOT NULL,
	"classification" "email_inbound_class" DEFAULT 'general' NOT NULL,
	"requires_human_review" boolean DEFAULT true NOT NULL,
	"status" "email_inbound_status" DEFAULT 'received' NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_inbound_provider_idx" ON "email_inbound_messages" USING btree ("client_id", "provider_event_id");
--> statement-breakpoint
CREATE INDEX "email_inbound_client_idx" ON "email_inbound_messages" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "email_inbound_status_idx" ON "email_inbound_messages" USING btree ("client_id", "status");
--> statement-breakpoint
ALTER TABLE "email_inbound_messages" ADD CONSTRAINT "email_inbound_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_inbound_messages" ADD CONSTRAINT "email_inbound_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_inbound_messages" ADD CONSTRAINT "email_inbound_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
