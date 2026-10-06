-- Super Admin: "Excluir conta" e "Dados de teste" (base comum).
-- tenants.is_protected: "Excluir conta" recusa. tenants.is_test_account: libera gerar/apagar dados de teste.
-- admin_operations: auditoria das operações do Super Admin. SEM ligação com tenants e com a coluna
-- target_tenant_id (não tenant_id), para nunca ser apagada junto com a conta (a exclusão acha as tabelas pelo tenant_id).
-- test_batches / test_batch_items: lotes de dados de teste e os ids exatos de cada registro criado.
-- Reversão: src/db/migrations-down/0011_admin_operations_test_data.down.sql
-- VPS: só com backup do banco e ensaio em banco descartável (ver docs/contexto_zensalon_vps.md).
ALTER TABLE "tenants"
  ADD COLUMN "is_protected" boolean NOT NULL DEFAULT false,
  ADD COLUMN "is_test_account" boolean NOT NULL DEFAULT false;--> statement-breakpoint
CREATE TABLE "admin_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "operation" varchar(30) NOT NULL,
  "target_tenant_id" uuid,
  "target_tenant_name" varchar(255),
  "actor" varchar(255) NOT NULL,
  "ip" varchar(64),
  "status" varchar(20) NOT NULL DEFAULT 'started',
  "counts" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  "finished_at" timestamp with time zone,
  CONSTRAINT "admin_operations_operation_check" CHECK ("operation" IN ('tenant_delete','test_generate','test_delete')),
  CONSTRAINT "admin_operations_status_check" CHECK ("status" IN ('started','done','partial','failed'))
);--> statement-breakpoint
CREATE INDEX "admin_operations_target_idx" ON "admin_operations" ("target_tenant_id", "started_at");--> statement-breakpoint
CREATE TABLE "test_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "status" varchar(20) NOT NULL DEFAULT 'generating',
  "created_by" varchar(255) NOT NULL,
  "counts" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "finished_at" timestamp with time zone,
  CONSTRAINT "test_batches_status_check" CHECK ("status" IN ('generating','ready','failed','deleted'))
);--> statement-breakpoint
CREATE INDEX "test_batches_tenant_idx" ON "test_batches" ("tenant_id", "status");--> statement-breakpoint
CREATE TABLE "test_batch_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL REFERENCES "test_batches"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "table_name" varchar(63) NOT NULL,
  "record_id" uuid NOT NULL,
  "kind" varchar(10) NOT NULL DEFAULT 'root',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "test_batch_items_kind_check" CHECK ("kind" IN ('root','derived')),
  CONSTRAINT "test_batch_items_record_unique" UNIQUE ("table_name", "record_id")
);--> statement-breakpoint
CREATE INDEX "test_batch_items_batch_idx" ON "test_batch_items" ("batch_id");--> statement-breakpoint
CREATE INDEX "test_batch_items_tenant_idx" ON "test_batch_items" ("tenant_id", "table_name");
