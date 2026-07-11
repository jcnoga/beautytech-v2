-- ============================================================
-- VITRINE DIGITAL PREMIUM — salon_profiles, portfolio_images, promotions
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- ============================================================

CREATE TYPE "promotion_discount_type" AS ENUM('percentage', 'fixed_amount');

CREATE TABLE IF NOT EXISTS "portfolio_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"professional_id" uuid,
	"image_url" text NOT NULL,
	"caption" varchar(200),
	"category" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" text,
	"discount_type" "promotion_discount_type" NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS "salon_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tagline" varchar(150),
	"description" text,
	"cover_image_url" text,
	"instagram_url" varchar(300),
	"whatsapp_number" varchar(20),
	"address_full" varchar(300),
	"is_premium_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "salon_profiles_tenant_id_unique" UNIQUE("tenant_id")
);

CREATE INDEX IF NOT EXISTS "portfolio_images_tenant_idx" ON "portfolio_images" ("tenant_id");
CREATE INDEX IF NOT EXISTS "portfolio_images_professional_idx" ON "portfolio_images" ("professional_id");
CREATE INDEX IF NOT EXISTS "promotions_tenant_idx" ON "promotions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "salon_profiles_tenant_idx" ON "salon_profiles" ("tenant_id");

ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "salon_profiles" ADD CONSTRAINT "salon_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
