-- leads.status: enum lead_status → varchar(30), mantendo os valores atuais (USING ::text).
-- Motivo: o funil de interessados do Pilates usa etapas próprias (ex.: 'trial') e novas etapas devem entrar
-- sem migração. A lista válida de cada nicho fica no código e é conferida no backend:
--   salão  → dtos.ts (leadCreateDto, valores do enum lead_status, que continua existindo no banco);
--   Pilates → modules/group-classes/lead-stages.ts.
-- Reversão: src/db/migrations-down/0006_leads_status_text.down.sql
-- VPS: NÃO aplicar antes do merge com o ramo vps, e só com backup do banco (ver docs/contexto_zensalon_vps.md).
ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" TYPE varchar(30) USING "status"::text;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new';
