-- Limite individual da conta: VAZIO = segue o plano do nicho (Super Admin → Planos; billing/plan-limits.service.ts).
-- max_clients: as contas com o padrão antigo (100) passam a seguir o plano; valores diferentes de 100 foram
--   definidos à mão no Super Admin e continuam valendo.
-- max_professionals: só deixa de ser obrigatório e o padrão vira vazio (conta nova segue o plano);
--   os valores atuais das contas não mudam.
-- Reversão: src/db/migrations-down/0007_tenant_limits_nullable.down.sql
-- VPS: NÃO aplicar antes do merge com o ramo vps, e só com backup do banco (ver docs/contexto_zensalon_vps.md).
ALTER TABLE "tenants" ALTER COLUMN "max_clients" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "max_clients" DROP DEFAULT;--> statement-breakpoint
UPDATE "tenants" SET "max_clients" = NULL WHERE "max_clients" = 100;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "max_professionals" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "max_professionals" DROP DEFAULT;
