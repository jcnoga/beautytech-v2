-- Pilates, Fase 2 (base): alunos, instrutores, planos e matrículas. Ver docs/prompt_pilates_zensalon.md.
-- Alunos, instrutores e modalidades REAPROVEITAM clients, professionals e services (sem cadastro duplicado).
-- Tudo com tenant_id. Nenhum campo médico (itens 7, 17 e C8).

-- Instrutor: registro profissional opcional (CREF/CREFITO), C8. Os outros nichos não usam.
ALTER TABLE "professionals" ADD COLUMN "professional_registration" varchar(40);--> statement-breakpoint

-- Dados de Pilates do aluno: 1 para 1 com clients.
CREATE TABLE "pilates_student_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "goal" text,
  "level" varchar(20) NOT NULL DEFAULT 'beginner',
  "start_date" date,
  "weekly_frequency" smallint,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "instructor_id" uuid REFERENCES "professionals"("id") ON DELETE SET NULL,
  "notes" text,
  "emergency_contact_name" varchar(255),
  "emergency_contact_phone" varchar(20),
  "initial_assessment_date" date,
  "declared_restrictions" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pilates_student_profiles_client_unique" UNIQUE ("client_id"),
  CONSTRAINT "pilates_student_profiles_level_check" CHECK ("level" IN ('beginner', 'intermediate', 'advanced')),
  CONSTRAINT "pilates_student_profiles_status_check" CHECK ("status" IN ('active', 'paused', 'inactive', 'cancelled')),
  CONSTRAINT "pilates_student_profiles_frequency_check" CHECK ("weekly_frequency" IS NULL OR "weekly_frequency" BETWEEN 1 AND 7)
);--> statement-breakpoint
CREATE INDEX "pilates_student_profiles_tenant_status_idx" ON "pilates_student_profiles" ("tenant_id", "status");--> statement-breakpoint

-- Planos de Pilates (C1): por frequência (mensalidade, aulas/semana, vigência em meses)
-- ou pacote (créditos: total de aulas e validade em dias). Aula experimental = pacote marcado como experimental.
CREATE TABLE "pilates_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "kind" varchar(20) NOT NULL,
  "price" numeric(10, 2) DEFAULT '0' NOT NULL,
  "classes_per_week" smallint,
  "duration_months" smallint,
  "total_classes" integer,
  "validity_days" integer,
  "modality_id" uuid REFERENCES "services"("id") ON DELETE SET NULL,
  "is_trial" boolean DEFAULT false NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pilates_plans_kind_check" CHECK ("kind" IN ('frequency', 'package')),
  CONSTRAINT "pilates_plans_status_check" CHECK ("status" IN ('active', 'inactive')),
  CONSTRAINT "pilates_plans_price_check" CHECK ("price" >= 0),
  CONSTRAINT "pilates_plans_frequency_check" CHECK ("kind" <> 'frequency' OR (
    "classes_per_week" BETWEEN 1 AND 7 AND "duration_months" BETWEEN 1 AND 12 AND NOT "is_trial")),
  CONSTRAINT "pilates_plans_package_check" CHECK ("kind" <> 'package' OR (
    "total_classes" >= 1 AND "validity_days" >= 1))
);--> statement-breakpoint
CREATE INDEX "pilates_plans_tenant_status_idx" ON "pilates_plans" ("tenant_id", "status");--> statement-breakpoint

-- Matrículas: aluno + plano, cada uma com seus dados. Um aluno pode ter várias ativas ao mesmo tempo
-- (ex.: mensal + pacote). Horários fixos (C2) entram na Fase 3, junto com a grade de aulas.
CREATE TABLE "pilates_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "plan_id" uuid NOT NULL REFERENCES "pilates_plans"("id") ON DELETE RESTRICT,
  "start_date" date NOT NULL,
  "end_date" date,
  "due_day" smallint,
  "price" numeric(10, 2) NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pilates_enrollments_status_check" CHECK ("status" IN ('active', 'paused', 'ended', 'cancelled')),
  CONSTRAINT "pilates_enrollments_due_day_check" CHECK ("due_day" IS NULL OR "due_day" BETWEEN 1 AND 28),
  CONSTRAINT "pilates_enrollments_price_check" CHECK ("price" >= 0),
  CONSTRAINT "pilates_enrollments_dates_check" CHECK ("end_date" IS NULL OR "end_date" >= "start_date")
);--> statement-breakpoint
CREATE INDEX "pilates_enrollments_tenant_status_idx" ON "pilates_enrollments" ("tenant_id", "status");--> statement-breakpoint
CREATE INDEX "pilates_enrollments_client_idx" ON "pilates_enrollments" ("client_id");--> statement-breakpoint
CREATE INDEX "pilates_enrollments_plan_idx" ON "pilates_enrollments" ("plan_id");
