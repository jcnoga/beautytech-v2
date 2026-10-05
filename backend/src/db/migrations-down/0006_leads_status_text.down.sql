-- Reversão manual da migration 0006_leads_status_text (o migrator do Drizzle não tem "down").
-- Rodar só com backup e numa transação. Volta leads.status para o enum lead_status.
-- As etapas do Pilates que não existem no enum precisam virar uma etapa do enum antes:
--   'trial' (Experimental) → 'scheduled'. Confira antes se há outros valores fora do enum:
--   SELECT status, count(*) FROM leads
--   WHERE status NOT IN ('new','contacted','interested','scheduled','converted','lost') GROUP BY status;
BEGIN;
UPDATE "leads" SET "status" = 'scheduled' WHERE "status" = 'trial';
ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "status" TYPE lead_status USING "status"::lead_status;
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new';
-- Desregistrar a migration, para o migrator poder aplicá-la de novo no futuro:
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791000000000;
COMMIT;
