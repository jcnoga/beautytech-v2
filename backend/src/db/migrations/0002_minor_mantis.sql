-- BASELINE: tabelas que ja existiam so no banco de producao (criadas a mao).
-- Num banco restaurado do dump de producao, NAO executar: registrar 0000-0002
-- como aplicadas em drizzle.__drizzle_migrations (ver roteiro de copia dos dados).
-- Em banco vazio (dev/teste), roda normalmente depois de 0000 e 0001.
CREATE TABLE IF NOT EXISTS "appointment_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"appointment_id" uuid,
	"type" varchar(20) DEFAULT 'before' NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text,
	"description" text,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auto_reply_conversations" (
	"tenant_id" uuid NOT NULL,
	"contact_phone" varchar(30) NOT NULL,
	"last_message_id" uuid,
	"last_replied_at" timestamp with time zone,
	CONSTRAINT "auto_reply_conversations_pk" UNIQUE("tenant_id","contact_phone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auto_reply_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"audience" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auto_reply_settings" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"link_target" varchar(20) DEFAULT 'booking' NOT NULL,
	"cooldown_hours" integer DEFAULT 24 NOT NULL,
	"reply_delay_min_seconds" integer DEFAULT 5 NOT NULL,
	"reply_delay_max_seconds" integer DEFAULT 8 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"reminder_24h_enabled" boolean DEFAULT true NOT NULL,
	"reminder_24h_hours" integer DEFAULT 24 NOT NULL,
	"reminder_2h_enabled" boolean DEFAULT true NOT NULL,
	"reminder_2h_hours" integer DEFAULT 2 NOT NULL,
	"birthday_enabled" boolean DEFAULT true NOT NULL,
	"birthday_hour" integer DEFAULT 9 NOT NULL,
	"reactivation_enabled" boolean DEFAULT true NOT NULL,
	"reactivation_days" integer DEFAULT 30 NOT NULL,
	"post_service_enabled" boolean DEFAULT true NOT NULL,
	"post_service_hours" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_settings_tenant_id_key" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"type" varchar(50) DEFAULT 'anamnesis' NOT NULL,
	"allergies" text[] DEFAULT '{}'::text[] NOT NULL,
	"medications" text,
	"medical_history" text,
	"previous_procedures" text,
	"skin_type" varchar(50),
	"contraindications" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"main_complaint" text,
	"aesthetic_history" text,
	"pregnancy" boolean DEFAULT false,
	"pre_existing_conditions" text,
	"clinical_observations" text,
	"treatment_evolution" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"type" varchar(50) DEFAULT 'lgpd' NOT NULL,
	"content" text,
	"signed_at" timestamp with time zone,
	"signed_by_name" varchar(255),
	"ip_address" varchar(45),
	"is_signed" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "package_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"sessions_contracted" integer DEFAULT 0 NOT NULL,
	"sessions_used" integer DEFAULT 0 NOT NULL,
	"sessions_remaining" integer,
	"started_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone,
	"status" varchar DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "plan_settings_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professional_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professional_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"is_working" boolean DEFAULT true NOT NULL,
	"start_time" varchar(5) DEFAULT '08:00' NOT NULL,
	"end_time" varchar(5) DEFAULT '18:00' NOT NULL,
	"slot_minutes" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"break_start" varchar(5),
	"break_end" varchar(5),
	CONSTRAINT "professional_schedules_prof_day_unique" UNIQUE("professional_id","day_of_week")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professional_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"commission_type" varchar(10) DEFAULT 'percent' NOT NULL,
	"commission_value" numeric(10, 2) DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professional_services_professional_id_service_id_key" UNIQUE("professional_id","service_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prospect_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(10),
	"city" varchar(100),
	"niche" varchar(100) NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"website" varchar(255),
	"address" text,
	"type" varchar(100),
	"rating" numeric(3, 1),
	"review_count" integer,
	"google_maps_link" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"last_sent_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prospect_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"message" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "protocol_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"protocol_id" uuid NOT NULL,
	"session_number" integer DEFAULT 1 NOT NULL,
	"performed_at" timestamp with time zone,
	"performed_by" uuid,
	"evolution" text,
	"observations" text,
	"status" varchar DEFAULT 'scheduled' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "protocol_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"protocol_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"service_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_sessions" integer DEFAULT 1,
	"interval_days" integer DEFAULT 7,
	"nicho" varchar DEFAULT 'clinic'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now(),
	"channel" varchar(10) DEFAULT 'email'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treatment_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"protocol_id" uuid,
	"total_sessions" integer DEFAULT 5 NOT NULL,
	"validity_days" integer DEFAULT 365,
	"price" numeric(10, 2) DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_photos_appointment_idx" ON "appointment_photos" ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_photos_client_idx" ON "appointment_photos" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_photos_tenant_idx" ON "appointment_photos" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_records_client_idx" ON "client_records" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_records_tenant_idx" ON "client_records" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consent_forms_client_idx" ON "consent_forms" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consent_forms_tenant_idx" ON "consent_forms" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_package_sessions_client" ON "package_sessions" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_package_sessions_tenant" ON "package_sessions" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professional_blocks_professional_id_idx" ON "professional_blocks" ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professional_blocks_starts_at_ends_at_idx" ON "professional_blocks" ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professional_blocks_tenant_id_idx" ON "professional_blocks" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professional_schedules_professional_id_idx" ON "professional_schedules" ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professional_schedules_tenant_id_idx" ON "professional_schedules" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professional_services_professional_id_idx" ON "professional_services" ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professional_services_service_id_idx" ON "professional_services" ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professional_services_tenant_id_idx" ON "professional_services" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prospect_leads_niche" ON "prospect_leads" ("niche");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prospect_leads_phone" ON "prospect_leads" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prospect_leads_status" ON "prospect_leads" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_protocol_sessions_client" ON "protocol_sessions" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_protocol_sessions_tenant" ON "protocol_sessions" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "protocol_steps_protocol_idx" ON "protocol_steps" ("protocol_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "protocols_tenant_idx" ON "protocols" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sub_notifications_tenant" ON "subscription_notifications" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_treatment_packages_tenant" ON "treatment_packages" ("tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_photos" ADD CONSTRAINT "appointment_photos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_photos" ADD CONSTRAINT "appointment_photos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_photos" ADD CONSTRAINT "appointment_photos_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auto_reply_conversations" ADD CONSTRAINT "auto_reply_conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auto_reply_conversations" ADD CONSTRAINT "auto_reply_conversations_last_message_id_auto_reply_messages_id_fk" FOREIGN KEY ("last_message_id") REFERENCES "auto_reply_messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auto_reply_messages" ADD CONSTRAINT "auto_reply_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auto_reply_settings" ADD CONSTRAINT "auto_reply_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_settings" ADD CONSTRAINT "automation_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_records" ADD CONSTRAINT "client_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_records" ADD CONSTRAINT "client_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consent_forms" ADD CONSTRAINT "consent_forms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consent_forms" ADD CONSTRAINT "consent_forms_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "package_sessions" ADD CONSTRAINT "package_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "package_sessions" ADD CONSTRAINT "package_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "package_sessions" ADD CONSTRAINT "package_sessions_package_id_treatment_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "treatment_packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_blocks" ADD CONSTRAINT "professional_blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_blocks" ADD CONSTRAINT "professional_blocks_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_schedules" ADD CONSTRAINT "professional_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_schedules" ADD CONSTRAINT "professional_schedules_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocol_sessions" ADD CONSTRAINT "protocol_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocol_sessions" ADD CONSTRAINT "protocol_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocol_sessions" ADD CONSTRAINT "protocol_sessions_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocol_sessions" ADD CONSTRAINT "protocol_sessions_performed_by_professionals_id_fk" FOREIGN KEY ("performed_by") REFERENCES "professionals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocol_steps" ADD CONSTRAINT "protocol_steps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocol_steps" ADD CONSTRAINT "protocol_steps_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocols" ADD CONSTRAINT "protocols_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocols" ADD CONSTRAINT "protocols_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_notifications" ADD CONSTRAINT "subscription_notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_packages" ADD CONSTRAINT "treatment_packages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_packages" ADD CONSTRAINT "treatment_packages_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
