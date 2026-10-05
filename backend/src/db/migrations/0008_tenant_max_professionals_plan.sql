-- max_professionals com o padrão antigo (1) passa a vazio = segue o plano do nicho (mesmo tratamento do
-- max_clients na 0007). Valores diferentes de 1 foram definidos à mão no Super Admin e continuam valendo.
-- Obs.: uma conta ajustada à mão para exatamente 1 não se distingue do padrão e também passa a seguir o plano.
-- Reversão: src/db/migrations-down/0008_tenant_max_professionals_plan.down.sql
-- VPS: NÃO aplicar antes do merge com o ramo vps, e só com backup do banco (ver docs/contexto_zensalon_vps.md).
UPDATE "tenants" SET "max_professionals" = NULL WHERE "max_professionals" = 1;
