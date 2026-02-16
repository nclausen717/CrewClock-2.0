-- Create company table
CREATE TABLE "company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_email_unique" UNIQUE("email")
);
--> statement-breakpoint
-- Create company session table
CREATE TABLE "company_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
-- Add company_id to user table
ALTER TABLE "user" ADD COLUMN "company_id" uuid NOT NULL;
--> statement-breakpoint
-- Add company_id to crews table
ALTER TABLE "crews" ADD COLUMN "company_id" uuid NOT NULL;
--> statement-breakpoint
-- Add company_id to job_sites table
ALTER TABLE "job_sites" ADD COLUMN "company_id" uuid NOT NULL;
--> statement-breakpoint
-- Add company_id to time_entries table
ALTER TABLE "time_entries" ADD COLUMN "company_id" uuid NOT NULL;
--> statement-breakpoint
-- Remove unique constraint on crews.name (now only unique per company)
ALTER TABLE "crews" DROP CONSTRAINT "crews_name_unique";
--> statement-breakpoint
-- Add foreign key constraints
ALTER TABLE "company_session" ADD CONSTRAINT "company_session_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crews" ADD CONSTRAINT "crews_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_sites" ADD CONSTRAINT "job_sites_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
