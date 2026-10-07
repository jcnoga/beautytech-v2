-- Dados de exemplo do cadastro (salão, barbearia, clínica) anotados como lote, igual aos dados de teste.
-- test_batches.kind: 'test' (dados de teste do Super Admin) ou 'example' (exemplo criado no cadastro da conta).
-- Lote 'example' não impede assinar plano e não aparece na tela "Dados de teste" do Super Admin; o dono o remove
-- em "Remover dados de exemplo". Linhas existentes ficam 'test' (todas vieram dos dados de teste).
-- Só acrescenta uma coluna com valor padrão: não altera nem apaga nada existente.
-- Reversão: src/db/migrations-down/0012_example_batches.down.sql
-- VPS: só com backup do banco e ensaio em banco descartável (ver docs/contexto_zensalon_vps.md).
ALTER TABLE "test_batches"
  ADD COLUMN "kind" varchar(10) NOT NULL DEFAULT 'test',
  ADD CONSTRAINT "test_batches_kind_check" CHECK ("kind" IN ('test','example'));--> statement-breakpoint
CREATE INDEX "test_batches_tenant_kind_idx" ON "test_batches" ("tenant_id", "kind", "status");
