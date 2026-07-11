DO $$ BEGIN
 CREATE TYPE "promotion_discount_type" AS ENUM('percentage', 'fixed_amount');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "plan_tier" ADD VALUE 'free';--> statement-breakpoint
ALTER TYPE "plan_tier" ADD VALUE 'super';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "cpf_cnpj" varchar(18);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "has_wifi" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "has_parking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_mode" varchar(20) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_api_url" varchar(500);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_api_key" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_instance" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "meta_phone_number_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "meta_access_token" varchar(1000);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "meta_waba_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "meta_business_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_status" varchar(20) DEFAULT 'disconnected' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan_period" varchar(10) DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan_status" varchar(20) DEFAULT 'trial';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan_cancel_at_period_end" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "asaas_customer_id" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "asaas_subscription_id" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "max_professionals" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_type" varchar(50) DEFAULT 'beauty_salon' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "primary_color" varchar(20) DEFAULT '#c9a96e';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "gallery_images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "custom_domain" varchar(255);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "cpf_cnpj" varchar(18);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_images_tenant_idx" ON "portfolio_images" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_images_professional_idx" ON "portfolio_images" ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promotions_tenant_idx" ON "promotions" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "salon_profiles_tenant_idx" ON "salon_profiles" ("tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotions" ADD CONSTRAINT "promotions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salon_profiles" ADD CONSTRAINT "salon_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_custom_domain_unique" UNIQUE("custom_domain");