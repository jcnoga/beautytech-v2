-- Nichos (tenants.business_type): valores estáveis e controlados. Ver src/config/features.ts.
-- Vazio ou fora da lista vira 'beauty_salon' (padrão histórico) antes da regra, para nenhum salão
-- atual ficar inválido. Nenhum dado de produção muda hoje (todos já estão na lista).
UPDATE "tenants" SET "business_type" = 'beauty_salon'
WHERE "business_type" IS NULL OR "business_type" NOT IN ('beauty_salon', 'barbershop', 'aesthetics_clinic', 'pilates');--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_business_type_check"
  CHECK ("business_type" IN ('beauty_salon', 'barbershop', 'aesthetics_clinic', 'pilates'));
