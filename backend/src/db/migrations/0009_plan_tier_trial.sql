-- plan_tier: garante os valores 'trial' e 'enterprise'. As migrations 0000/0001 os criam, mas o banco de produção
-- (vindo do Railway) tem só free, basic, pro e super; sem 'trial', o cadastro de conta nova (que nasce em Trial)
-- falharia. IF NOT EXISTS: onde os valores já existem, nada muda.
-- O Drizzle aplica todas as migrations pendentes numa única transação. No Postgres 12+ o ADD VALUE pode rodar
-- dentro dela, mas o valor novo só pode ser USADO depois do COMMIT: por isso nenhuma migration usa 'trial' nem
-- 'enterprise' (nem em DEFAULT), e esta é a última da fila.
-- Reversão: não é possível remover valor de enum no Postgres; os valores ficam (inofensivos se não usados).
ALTER TYPE "plan_tier" ADD VALUE IF NOT EXISTS 'trial';--> statement-breakpoint
ALTER TYPE "plan_tier" ADD VALUE IF NOT EXISTS 'enterprise';
