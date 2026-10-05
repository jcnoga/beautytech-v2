-- Pilates, Fase 3: regras configuráveis, grade de aulas, aulas (ocorrências), horários fixos,
-- inscrições/presença, reposições e pausas. Ver docs/prompt_pilates_zensalon.md (itens 8-15, C2-C7).
-- Regra geral: padrão do studio (class_settings) + exceção opcional por plano (colunas em membership_plans,
-- NULL = usa o padrão do studio). Horários em UTC; "hoje" e prazos calculados em America/Sao_Paulo.

-- ─── padrões do studio ──────────────────────────────────────────────────────
CREATE TABLE "class_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "allow_individual_slot" boolean DEFAULT true NOT NULL,
  "individual_slot_capacity" smallint DEFAULT 1 NOT NULL,
  "cancel_deadline_enabled" boolean DEFAULT true NOT NULL,
  "cancel_min_hours" integer DEFAULT 12 NOT NULL,
  "makeup_enabled" boolean DEFAULT true NOT NULL,
  "makeup_validity_days" integer DEFAULT 30 NOT NULL,
  "makeup_monthly_limit_enabled" boolean DEFAULT true NOT NULL,
  "makeup_max_per_month" integer DEFAULT 2 NOT NULL,
  "unexcused_absence_consumes_credit" boolean DEFAULT true NOT NULL,
  "unexcused_absence_generates_makeup" boolean DEFAULT false NOT NULL,
  "excused_absence_generates_makeup" boolean DEFAULT true NOT NULL,
  "excused_absence_consumes_credit" boolean DEFAULT false NOT NULL,
  "timely_cancel_generates_makeup" boolean DEFAULT true NOT NULL,
  "late_cancel_consumes_credit" boolean DEFAULT true NOT NULL,
  "studio_cancel_action_package" varchar(20) DEFAULT 'refund_credit' NOT NULL,
  "studio_cancel_action_frequency" varchar(20) DEFAULT 'generate_makeup' NOT NULL,
  "pause_enabled" boolean DEFAULT true NOT NULL,
  "pause_max_days" integer DEFAULT 30 NOT NULL,
  "instructor_attendance_scope" varchar(10) DEFAULT 'own' NOT NULL,
  "instructor_edit_window_hours" integer DEFAULT 24 NOT NULL,
  "default_class_duration" integer DEFAULT 50 NOT NULL,
  "default_class_capacity" integer DEFAULT 4 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_settings_tenant_unique" UNIQUE ("tenant_id"),
  CONSTRAINT "class_settings_individual_capacity_check" CHECK ("individual_slot_capacity" IN (1, 2)),
  CONSTRAINT "class_settings_cancel_hours_check" CHECK ("cancel_min_hours" BETWEEN 0 AND 168),
  CONSTRAINT "class_settings_makeup_validity_check" CHECK ("makeup_validity_days" BETWEEN 1 AND 365),
  CONSTRAINT "class_settings_makeup_max_check" CHECK ("makeup_max_per_month" BETWEEN 0 AND 31),
  CONSTRAINT "class_settings_studio_cancel_check" CHECK ("studio_cancel_action_package" IN ('refund_credit', 'generate_makeup')
    AND "studio_cancel_action_frequency" IN ('refund_credit', 'generate_makeup')),
  CONSTRAINT "class_settings_pause_check" CHECK ("pause_max_days" BETWEEN 1 AND 365),
  CONSTRAINT "class_settings_scope_check" CHECK ("instructor_attendance_scope" IN ('own', 'all')),
  CONSTRAINT "class_settings_edit_window_check" CHECK ("instructor_edit_window_hours" BETWEEN 0 AND 720),
  CONSTRAINT "class_settings_defaults_check" CHECK ("default_class_duration" BETWEEN 10 AND 300 AND "default_class_capacity" BETWEEN 1 AND 50)
);--> statement-breakpoint
-- Studios que já existem recebem os padrões.
INSERT INTO "class_settings" ("tenant_id") SELECT "id" FROM "tenants" WHERE "business_type" = 'pilates'
ON CONFLICT ("tenant_id") DO NOTHING;--> statement-breakpoint

-- ─── exceções por plano (NULL = padrão do studio) ───────────────────────────
ALTER TABLE "membership_plans"
  ADD COLUMN "allow_individual_slot" boolean,
  ADD COLUMN "individual_slot_capacity" smallint,
  ADD COLUMN "cancel_deadline_enabled" boolean,
  ADD COLUMN "cancel_min_hours" integer,
  ADD COLUMN "makeup_enabled" boolean,
  ADD COLUMN "makeup_validity_days" integer,
  ADD COLUMN "makeup_monthly_limit_enabled" boolean,
  ADD COLUMN "makeup_max_per_month" integer,
  ADD COLUMN "unexcused_absence_consumes_credit" boolean,
  ADD COLUMN "unexcused_absence_generates_makeup" boolean,
  ADD COLUMN "excused_absence_generates_makeup" boolean,
  ADD COLUMN "excused_absence_consumes_credit" boolean,
  ADD COLUMN "timely_cancel_generates_makeup" boolean,
  ADD COLUMN "late_cancel_consumes_credit" boolean,
  ADD COLUMN "studio_cancel_action" varchar(20),
  ADD COLUMN "pause_enabled" boolean,
  ADD COLUMN "pause_max_days" integer,
  ADD CONSTRAINT "membership_plans_rule_ranges_check" CHECK (
    ("individual_slot_capacity" IS NULL OR "individual_slot_capacity" IN (1, 2))
    AND ("cancel_min_hours" IS NULL OR "cancel_min_hours" BETWEEN 0 AND 168)
    AND ("makeup_validity_days" IS NULL OR "makeup_validity_days" BETWEEN 1 AND 365)
    AND ("makeup_max_per_month" IS NULL OR "makeup_max_per_month" BETWEEN 0 AND 31)
    AND ("studio_cancel_action" IS NULL OR "studio_cancel_action" IN ('refund_credit', 'generate_makeup'))
    AND ("pause_max_days" IS NULL OR "pause_max_days" BETWEEN 1 AND 365));--> statement-breakpoint

-- ─── grade semanal ──────────────────────────────────────────────────────────
CREATE TABLE "class_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "modality_id" uuid REFERENCES "services"("id") ON DELETE SET NULL,
  "instructor_id" uuid NOT NULL REFERENCES "professionals"("id") ON DELETE RESTRICT,
  "day_of_week" smallint NOT NULL,
  "start_time" varchar(5) NOT NULL,
  "duration_minutes" integer NOT NULL,
  "room" varchar(100),
  "capacity" integer NOT NULL,
  "class_type" varchar(20) DEFAULT 'group' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "owner_enrollment_id" uuid REFERENCES "membership_enrollments"("id") ON DELETE SET NULL, -- horário individual criado por uma matrícula
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_schedules_dow_check" CHECK ("day_of_week" BETWEEN 0 AND 6),
  CONSTRAINT "class_schedules_time_check" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT "class_schedules_duration_check" CHECK ("duration_minutes" BETWEEN 10 AND 300),
  CONSTRAINT "class_schedules_capacity_check" CHECK ("capacity" BETWEEN 1 AND 50),
  CONSTRAINT "class_schedules_type_check" CHECK ("class_type" IN ('individual', 'duo', 'group'))
);--> statement-breakpoint
CREATE INDEX "class_schedules_tenant_idx" ON "class_schedules" ("tenant_id", "is_active");--> statement-breakpoint
CREATE INDEX "class_schedules_instructor_idx" ON "class_schedules" ("instructor_id", "day_of_week");--> statement-breakpoint

-- ─── aulas (ocorrências) ────────────────────────────────────────────────────
CREATE TABLE "class_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "schedule_id" uuid REFERENCES "class_schedules"("id") ON DELETE SET NULL,
  "session_date" date NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "instructor_id" uuid NOT NULL REFERENCES "professionals"("id") ON DELETE RESTRICT,
  "modality_id" uuid REFERENCES "services"("id") ON DELETE SET NULL,
  "room" varchar(100),
  "capacity" integer NOT NULL,
  "class_type" varchar(20) DEFAULT 'group' NOT NULL,
  "status" varchar(20) DEFAULT 'scheduled' NOT NULL,
  "instructor_overridden" boolean DEFAULT false NOT NULL, -- instrutor trocado só nesta aula: edição da grade não sobrescreve
  "notes" text,
  "cancel_reason" varchar(255),
  "cancelled_at" timestamp with time zone,
  "cancelled_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_sessions_schedule_date_unique" UNIQUE ("schedule_id", "session_date"),
  CONSTRAINT "class_sessions_capacity_check" CHECK ("capacity" BETWEEN 1 AND 50),
  CONSTRAINT "class_sessions_type_check" CHECK ("class_type" IN ('individual', 'duo', 'group', 'assessment')),
  CONSTRAINT "class_sessions_status_check" CHECK ("status" IN ('scheduled', 'cancelled')),
  CONSTRAINT "class_sessions_times_check" CHECK ("ends_at" > "starts_at")
);--> statement-breakpoint
CREATE INDEX "class_sessions_tenant_start_idx" ON "class_sessions" ("tenant_id", "starts_at");--> statement-breakpoint

-- ─── horários fixos da matrícula (C2) ───────────────────────────────────────
CREATE TABLE "class_enrollment_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "enrollment_id" uuid NOT NULL REFERENCES "membership_enrollments"("id") ON DELETE CASCADE,
  "schedule_id" uuid NOT NULL REFERENCES "class_schedules"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_enrollment_slots_unique" UNIQUE ("enrollment_id", "schedule_id")
);--> statement-breakpoint
CREATE INDEX "class_enrollment_slots_schedule_idx" ON "class_enrollment_slots" ("schedule_id");--> statement-breakpoint

-- ─── reposições (C5) ────────────────────────────────────────────────────────
CREATE TABLE "class_makeup_credits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "enrollment_id" uuid REFERENCES "membership_enrollments"("id") ON DELETE SET NULL,
  "origin_booking_id" uuid,
  "reason" varchar(30) NOT NULL,
  "expires_on" date NOT NULL,
  "status" varchar(20) DEFAULT 'available' NOT NULL,
  "used_booking_id" uuid,
  "used_at" timestamp with time zone,
  "rule_source" varchar(10), -- regra aplicada ao gerar: 'studio' ou 'plan' (histórico do aluno)
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_makeup_credits_reason_check" CHECK ("reason" IN ('timely_cancel', 'excused_absence', 'unexcused_absence', 'studio_cancel')),
  CONSTRAINT "class_makeup_credits_status_check" CHECK ("status" IN ('available', 'used', 'expired'))
);--> statement-breakpoint
CREATE INDEX "class_makeup_credits_client_idx" ON "class_makeup_credits" ("tenant_id", "client_id", "status");--> statement-breakpoint

-- ─── inscrições e presença ──────────────────────────────────────────────────
CREATE TABLE "class_bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "session_id" uuid NOT NULL REFERENCES "class_sessions"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "enrollment_id" uuid REFERENCES "membership_enrollments"("id") ON DELETE SET NULL,
  "kind" varchar(20) NOT NULL,
  "status" varchar(20) DEFAULT 'booked' NOT NULL,
  "credit_consumed" boolean DEFAULT false NOT NULL,
  "makeup_credit_id" uuid REFERENCES "class_makeup_credits"("id") ON DELETE SET NULL,
  "attendance_marked_by" uuid,
  "attendance_marked_at" timestamp with time zone,
  "attendance_updated_by" uuid,
  "attendance_updated_at" timestamp with time zone,
  "cancelled_by" uuid,
  "cancelled_at" timestamp with time zone,
  -- Motivo e regra aplicada no momento do efeito (presença, falta, cancelamento): histórico do aluno.
  "effect_reason" varchar(30),
  "effect_rule_source" varchar(10),
  "effect_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_bookings_session_client_unique" UNIQUE ("session_id", "client_id"),
  CONSTRAINT "class_bookings_kind_check" CHECK ("kind" IN ('fixed', 'credit', 'makeup')),
  CONSTRAINT "class_bookings_status_check" CHECK ("status" IN ('booked', 'present', 'absent', 'excused',
    'cancelled', 'cancelled_late', 'cancelled_studio', 'paused'))
);--> statement-breakpoint
CREATE INDEX "class_bookings_client_idx" ON "class_bookings" ("tenant_id", "client_id");--> statement-breakpoint
CREATE INDEX "class_bookings_enrollment_idx" ON "class_bookings" ("enrollment_id");--> statement-breakpoint

-- ─── pausas (C6) ────────────────────────────────────────────────────────────
CREATE TABLE "membership_pauses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "enrollment_id" uuid NOT NULL REFERENCES "membership_enrollments"("id") ON DELETE CASCADE,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "days" integer NOT NULL,
  "reason" varchar(200),
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "membership_pauses_dates_check" CHECK ("end_date" >= "start_date" AND "days" = ("end_date" - "start_date" + 1))
);--> statement-breakpoint
CREATE INDEX "membership_pauses_enrollment_idx" ON "membership_pauses" ("enrollment_id");
