-- Conserto dos valores de plan_settings gravados como TEXTO JSON até 06/10/2026 (defeito do `${JSON.stringify(v)}::jsonb`:
-- o driver codificava de novo e salvava "30" em vez de 30; ai_monthly_budget_brl acumulou várias camadas de aspas).
-- Para cada valor do tipo string: desembrulha as camadas enquanto o conteúdo for JSON válido; se chegar num número
-- (ou objeto, lista, true/false), grava esse valor; texto de verdade (ex.: "abc") fica como está.
-- A API já lê os dois formatos (parseSetting / Number / parseFloat), então rodar antes ou depois do deploy não muda
-- o que os clientes veem. Rodar DEPOIS do deploy da correção da gravação (senão uma gravação nova volta a ser texto).
-- Produção: só com backup (deploy/backup-bancos.sh) e OK explícito. Uma transação; confira a prévia e o resultado.
--   docker exec -i vps-migrator-postgres sh -c 'psql -U "$POSTGRES_USER" -d zensalon -v ON_ERROR_STOP=1' < scripts/consertar-plan-settings.sql
BEGIN;

SELECT 'ANTES' AS etapa, key, jsonb_typeof(value) AS tipo, value::text AS valor
  FROM plan_settings WHERE jsonb_typeof(value) = 'string' ORDER BY key;

DO $$
DECLARE r record; v jsonb; i int; n int := 0;
BEGIN
  FOR r IN SELECT key, value FROM plan_settings WHERE jsonb_typeof(value) = 'string' FOR UPDATE LOOP
    v := r.value; i := 0;
    WHILE jsonb_typeof(v) = 'string' AND i < 10 LOOP
      BEGIN
        v := btrim(v #>> '{}')::jsonb;   -- conteúdo do texto, lido como JSON ("30" -> 30; "\"0\"" -> "0")
      EXCEPTION WHEN others THEN
        EXIT;                            -- texto de verdade: para aqui
      END;
      i := i + 1;
    END LOOP;
    IF jsonb_typeof(v) <> 'string' AND v IS DISTINCT FROM r.value THEN
      UPDATE plan_settings SET value = v, updated_at = now() WHERE key = r.key;
      n := n + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'valores consertados: %', n;
END $$;

SELECT 'DEPOIS' AS etapa, key, jsonb_typeof(value) AS tipo, value::text AS valor FROM plan_settings ORDER BY key;

COMMIT;
