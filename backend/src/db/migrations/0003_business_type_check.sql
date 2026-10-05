-- Alterada em 05/10/2026, ANTES de ir para a produção: no banco de produção (vindo do Railway) a coluna é o enum
-- business_type_enum (beauty_salon, aesthetics_clinic, barbershop), sem 'pilates'; a comparação com 'pilates'
-- abaixo falharia. Converte para varchar(50) (como nas migrations 0001) só se ainda for enum; onde já é texto,
-- nada muda. O tipo business_type_enum fica no banco, sem uso. Ver docs/contexto_zensalon_vps.md.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'tenants' AND column_name = 'business_type'
               AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE "tenants" ALTER COLUMN "business_type" DROP DEFAULT;
    ALTER TABLE "tenants" ALTER COLUMN "business_type" TYPE varchar(50) USING "business_type"::text;
    ALTER TABLE "tenants" ALTER COLUMN "business_type" SET DEFAULT 'beauty_salon';
  END IF;
END $$;--> statement-breakpoint
-- Nichos (tenants.business_type): valores estáveis e controlados. Ver src/config/features.ts.
-- Vazio ou fora da lista vira 'beauty_salon' (padrão histórico) antes da regra, para nenhum salão
-- atual ficar inválido. Nenhum dado de produção muda hoje (todos já estão na lista).
UPDATE "tenants" SET "business_type" = 'beauty_salon'
WHERE "business_type" IS NULL OR "business_type" NOT IN ('beauty_salon', 'barbershop', 'aesthetics_clinic', 'pilates');--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_business_type_check"
  CHECK ("business_type" IN ('beauty_salon', 'barbershop', 'aesthetics_clinic', 'pilates'));
