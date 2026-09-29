// ============================================================
// BEAUTYTECH v2 â€” SAAS Enterprise Multi-Tenant
// Drizzle ORM Schema Completo
// SalÃ£o de Beleza | Barbearia | EstÃ©tica | Spa | Franquias
// ============================================================

import {
  pgTable, pgEnum, uuid, varchar, text, boolean, integer,
  numeric, timestamp, date, jsonb, char, index, unique,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENUMS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const planTierEnum          = pgEnum("plan_tier",           ["free","basic","pro","super"]);
export const userRoleEnum          = pgEnum("user_role",           ["owner","manager","receptionist","professional","financial","marketing","viewer"]);
export const appointmentStatusEnum = pgEnum("appointment_status",  ["pending","confirmed","in_progress","completed","cancelled","no_show","rescheduled"]);
export const serviceTypeEnum       = pgEnum("service_type",        ["hair","nail","esthetic","beauty","massage","other"]);
export const transactionTypeEnum   = pgEnum("transaction_type",    ["revenue","expense","refund","transfer","commission"]);
export const transactionStatusEnum = pgEnum("transaction_status",  ["pending","confirmed","cancelled","refunded"]);
export const paymentMethodEnum     = pgEnum("payment_method",      ["cash","credit_card","debit_card","pix","bank_transfer","voucher","gift_card","loyalty_points","package","other"]);
export const clientSegmentEnum     = pgEnum("client_segment",      ["new","active","vip","loyal","at_risk","churned","reactivated"]);
export const loyaltyTierEnum       = pgEnum("loyalty_tier",        ["bronze","silver","gold","platinum","diamond"]);
export const leadStatusEnum        = pgEnum("lead_status",         ["new","contacted","interested","scheduled","converted","lost"]);
export const campaignStatusEnum    = pgEnum("campaign_status",     ["draft","scheduled","running","completed","cancelled"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["whatsapp","email","sms","push"]);
export const commissionTypeEnum    = pgEnum("commission_type",     ["fixed","percentage","tiered"]);
export const packageStatusEnum     = pgEnum("package_status",      ["active","paused","expired","cancelled","completed"]);
export const giftCardStatusEnum    = pgEnum("gift_card_status",    ["active","used","expired","cancelled"]);
export const stockMovementEnum     = pgEnum("stock_movement",      ["in","out","adjustment","loss","usage"]);
export const goalStatusEnum        = pgEnum("goal_status",         ["active","achieved","failed","cancelled"]);
export const reviewStatusEnum      = pgEnum("review_status",       ["pending","published","hidden"]);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const audit = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  version:   integer("version").notNull().default(1),
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TENANTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const tenants = pgTable("tenants", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         varchar("name", { length: 255 }).notNull(),
  slug:         varchar("slug", { length: 100 }).notNull().unique(),
  planTier:     planTierEnum("plan_tier").notNull().default("trial"),
  isActive:     boolean("is_active").notNull().default(true),
  email:        varchar("email", { length: 255 }),
  cpfCnpj:      varchar("cpf_cnpj", { length: 18 }),
  phone:        varchar("phone", { length: 20 }),
  whatsapp:     varchar("whatsapp", { length: 20 }),
  logoUrl:      text("logo_url"),
  addressStreet: varchar("address_street", { length: 255 }),
  addressCity:  varchar("address_city", { length: 100 }),
  addressState: char("address_state", { length: 2 }),
  addressZip:   varchar("address_zip", { length: 10 }),
  lat:          numeric("lat", { precision: 10, scale: 7 }),
  lng:          numeric("lng", { precision: 10, scale: 7 }),
  hasWifi:      boolean("has_wifi").notNull().default(false),
  hasParking:   boolean("has_parking").notNull().default(false),
  website:      varchar("website", { length: 255 }),
  instagram:    varchar("instagram", { length: 100 }),
  facebook:     varchar("facebook", { length: 100 }),
  googlePlaceId: varchar("google_place_id", { length: 100 }),
  businessHours: jsonb("business_hours").notNull().default({}),
  settings:     jsonb("settings").notNull().default({}),
  whatsappMode: varchar("whatsapp_mode", { length: 20 }).notNull().default("manual"),
  whatsappApiUrl: varchar("whatsapp_api_url", { length: 500 }),
  whatsappApiKey: varchar("whatsapp_api_key", { length: 255 }),
  whatsappInstance: varchar("whatsapp_instance", { length: 255 }),
  metaPhoneNumberId: varchar("meta_phone_number_id", { length: 255 }),
  metaAccessToken: varchar("meta_access_token", { length: 1000 }),
  metaWabaId: varchar("meta_waba_id", { length: 255 }),
  metaBusinessId: varchar("meta_business_id", { length: 255 }),
  metaPhoneNumberId: varchar("meta_phone_number_id", { length: 255 }),
  metaAccessToken: varchar("meta_access_token", { length: 1000 }),
  metaWabaId: varchar("meta_waba_id", { length: 255 }),
  metaBusinessId: varchar("meta_business_id", { length: 255 }),
  whatsappStatus: varchar("whatsapp_status", { length: 20 }).notNull().default("disconnected"),
  whatsappPhone: varchar("whatsapp_phone", { length: 20 }),
  whatsappConnectedAt: timestamp("whatsapp_connected_at", { withTimezone: true }),
  trialEndsAt:  timestamp("trial_ends_at", { withTimezone: true }),
  planPeriod:   varchar("plan_period", { length: 10 }).default("monthly"),
  planStartedAt: timestamp("plan_started_at", { withTimezone: true }),
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  planStatus:   varchar("plan_status", { length: 20 }).default("trial"),
  planCancelAtPeriodEnd: boolean("plan_cancel_at_period_end").default(false),
  asaasCustomerId: varchar("asaas_customer_id", { length: 100 }),
  asaasSubscriptionId: varchar("asaas_subscription_id", { length: 100 }),
  maxUsers:     integer("max_users").notNull().default(3),
  maxClients:       integer("max_clients").notNull().default(100),
  maxProfessionals: integer("max_professionals").notNull().default(1),
  businessType: varchar("business_type", { length: 50 }).notNull().default("beauty_salon"),
  primaryColor: varchar("primary_color", { length: 20 }).default("#c9a96e"),
  coverUrl:     text("cover_url"),
  galleryImages: jsonb("gallery_images").notNull().default([]),
  customDomain: varchar("custom_domain", { length: 255 }).unique(),
  ...audit,
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// USER PROFILES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const userProfiles = pgTable("user_profiles", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  authUserId:    uuid("auth_user_id").notNull().unique(),
  fullName:      varchar("full_name", { length: 255 }).notNull(),
  displayName:   varchar("display_name", { length: 100 }),
  email:         varchar("email", { length: 255 }),
  cpfCnpj:       varchar("cpf_cnpj", { length: 18 }),
  phone:         varchar("phone", { length: 20 }),
  whatsapp:      varchar("whatsapp", { length: 20 }),
  avatarUrl:     text("avatar_url"),
  role:          userRoleEnum("role").notNull().default("viewer"),
  isActive:      boolean("is_active").notNull().default(true),
  lastLoginAt:   timestamp("last_login_at", { withTimezone: true }),
  preferences:   jsonb("preferences").notNull().default({}),
  ...audit,
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PROFESSIONALS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const professionals = pgTable("professionals", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  tenantId:             uuid("tenant_id").notNull().references(() => tenants.id),
  userProfileId:        uuid("user_profile_id").references(() => userProfiles.id),
  fullName:             varchar("full_name", { length: 255 }).notNull(),
  displayName:          varchar("display_name", { length: 100 }),
  email:                varchar("email", { length: 255 }),
  phone:                varchar("phone", { length: 20 }),
  whatsapp:             varchar("whatsapp", { length: 20 }),
  avatarUrl:            text("avatar_url"),
  bio:                  text("bio"),
  specialties:          text("specialties").array().notNull().default(sql`'{}'::text[]`),
  commissionType:       commissionTypeEnum("commission_type").notNull().default("percentage"),
  commissionPct:        numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  commissionFixed:      numeric("commission_fixed", { precision: 10, scale: 2 }).notNull().default("0"),
  commissionTiers:      jsonb("commission_tiers").notNull().default([]),
  isActive:             boolean("is_active").notNull().default(true),
  acceptsOnlineBooking: boolean("accepts_online_booking").notNull().default(true),
  color:                varchar("color", { length: 7 }),
  workingHours:         jsonb("working_hours").notNull().default({}),
  breakTimes:           jsonb("break_times").notNull().default([]),
  sortOrder:            integer("sort_order").notNull().default(0),
  monthlyGoal:          numeric("monthly_goal", { precision: 10, scale: 2 }).notNull().default("0"),
  professionalRegistration: varchar("professional_registration", { length: 40 }), // Pilates: CREF/CREFITO (opcional)
  ...audit,
}, (t) => ({
  tenantIdx: index("professionals_tenant_idx").on(t.tenantId),
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CLIENTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const clients = pgTable("clients", {
  id:               uuid("id").primaryKey().defaultRandom(),
  tenantId:         uuid("tenant_id").notNull().references(() => tenants.id),
  fullName:         varchar("full_name", { length: 255 }).notNull(),
  displayName:      varchar("display_name", { length: 100 }),
  email:            varchar("email", { length: 255 }),
  phone:            varchar("phone", { length: 20 }),
  whatsapp:         varchar("whatsapp", { length: 20 }),
  gender:           varchar("gender", { length: 20 }),
  birthDate:        date("birth_date"),
  cpf:              varchar("cpf", { length: 14 }),
  avatarUrl:        text("avatar_url"),
  segment:          clientSegmentEnum("segment").notNull().default("new"),
  loyaltyTier:      loyaltyTierEnum("loyalty_tier").notNull().default("bronze"),
  loyaltyPoints:    integer("loyalty_points").notNull().default(0),
  cashbackBalance:  numeric("cashback_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  totalSpent:       numeric("total_spent", { precision: 10, scale: 2 }).notNull().default("0"),
  totalVisits:      integer("total_visits").notNull().default(0),
  averageTicket:    numeric("average_ticket", { precision: 10, scale: 2 }).notNull().default("0"),
  lastVisitAt:      timestamp("last_visit_at", { withTimezone: true }),
  firstVisitAt:     timestamp("first_visit_at", { withTimezone: true }),
  nextAppointmentAt: timestamp("next_appointment_at", { withTimezone: true }),
  preferredProfessionalId: uuid("preferred_professional_id"),
  acceptsMarketing: boolean("accepts_marketing").notNull().default(true),
  acceptsWhatsapp:  boolean("accepts_whatsapp").notNull().default(true),
  acceptsSms:       boolean("accepts_sms").notNull().default(false),
  isVip:            boolean("is_vip").notNull().default(false),
  isBlocked:        boolean("is_blocked").notNull().default(false),
  blockedReason:    text("blocked_reason"),
  noShowCount:      integer("no_show_count").notNull().default(0),
  cancellationCount: integer("cancellation_count").notNull().default(0),
  notes:            text("notes"),
  hairProfile:      jsonb("hair_profile").notNull().default({}),
  skinProfile:      jsonb("skin_profile").notNull().default({}),
  allergies:        text("allergies").array().notNull().default(sql`'{}'::text[]`),
  tags:             text("tags").array().notNull().default(sql`'{}'::text[]`),
  source:           varchar("source", { length: 50 }),
  referredById:     uuid("referred_by_id"),
  addressCity:      varchar("address_city", { length: 100 }),
  addressState:     char("address_state", { length: 2 }),
  customFields:     jsonb("custom_fields").notNull().default({}),
  isActive:         boolean("is_active").notNull().default(true),
  ...audit,
}, (t) => ({
  tenantIdx:    index("clients_tenant_idx").on(t.tenantId),
  phoneIdx:     index("clients_phone_idx").on(t.phone),
  whatsappIdx:  index("clients_whatsapp_idx").on(t.whatsapp),
  segmentIdx:   index("clients_segment_idx").on(t.segment),
  birthDateIdx: index("clients_birth_date_idx").on(t.birthDate),
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SERVICE CATEGORIES & SERVICES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const serviceCategories = pgTable("service_categories", {
  id:          uuid("id").primaryKey().defaultRandom(),
  tenantId:    uuid("tenant_id").notNull().references(() => tenants.id),
  name:        varchar("name", { length: 100 }).notNull(),
  type:        serviceTypeEnum("type").notNull().default("other"),
  description: text("description"),
  color:       varchar("color", { length: 7 }),
  icon:        varchar("icon", { length: 50 }),
  sortOrder:   integer("sort_order").notNull().default(0),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable("services", {
  id:               uuid("id").primaryKey().defaultRandom(),
  tenantId:         uuid("tenant_id").notNull().references(() => tenants.id),
  categoryId:       uuid("category_id").references(() => serviceCategories.id),
  name:             varchar("name", { length: 255 }).notNull(),
  description:      text("description"),
  durationMinutes:  integer("duration_minutes").notNull().default(60),
  price:            numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  priceMin:         numeric("price_min", { precision: 10, scale: 2 }),
  priceMax:         numeric("price_max", { precision: 10, scale: 2 }),
  commissionPct:    numeric("commission_pct", { precision: 5, scale: 2 }),
  isActive:         boolean("is_active").notNull().default(true),
  isOnlineBookable: boolean("is_online_bookable").notNull().default(true),
  requiresDeposit:  boolean("requires_deposit").notNull().default(false),
  depositAmount:    numeric("deposit_amount", { precision: 10, scale: 2 }),
  imageUrl:         text("image_url"),
  sortOrder:        integer("sort_order").notNull().default(0),
  ...audit,
}, (t) => ({
  tenantIdx: index("services_tenant_idx").on(t.tenantId),
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// APPOINTMENTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const appointments = pgTable("appointments", {
  id:              uuid("id").primaryKey().defaultRandom(),
  tenantId:        uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:        uuid("client_id").notNull().references(() => clients.id),
  professionalId:  uuid("professional_id").references(() => professionals.id),
  status:          appointmentStatusEnum("status").notNull().default("pending"),
  scheduledAt:     timestamp("scheduled_at", { withTimezone: true }).notNull(),
  endsAt:          timestamp("ends_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  subtotal:        numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount:  numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountReason:  varchar("discount_reason", { length: 255 }),
  totalPrice:      numeric("total_price", { precision: 10, scale: 2 }).notNull().default("0"),
  amountPaid:      numeric("amount_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentMethod:   paymentMethodEnum("payment_method"),
  paymentStatus:   varchar("payment_status", { length: 20 }).notNull().default("pending"),
  packageId:       uuid("package_id"),
  giftCardId:      uuid("gift_card_id"),
  internalNotes:   text("internal_notes"),
  clientNotes:     text("client_notes"),
  source:          varchar("source", { length: 50 }).notNull().default("manual"),
  confirmedAt:     timestamp("confirmed_at", { withTimezone: true }),
  checkinAt:       timestamp("checkin_at", { withTimezone: true }),
  checkoutAt:      timestamp("checkout_at", { withTimezone: true }),
  cancelledAt:     timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  reminderSentAt:  timestamp("reminder_sent_at", { withTimezone: true }),
  ...audit,
}, (t) => ({
  tenantIdx:     index("appointments_tenant_idx").on(t.tenantId),
  scheduledIdx:  index("appointments_scheduled_idx").on(t.scheduledAt),
  clientIdx:     index("appointments_client_idx").on(t.clientId),
  professionalIdx: index("appointments_professional_idx").on(t.professionalId),
  statusIdx:     index("appointments_status_idx").on(t.status),
}));

export const appointmentServices = pgTable("appointment_services", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id),
  appointmentId:  uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  serviceId:      uuid("service_id").notNull().references(() => services.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  price:          numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  commissionPct:  numeric("commission_pct", { precision: 5, scale: 2 }),
  commissionAmt:  numeric("commission_amt", { precision: 10, scale: 2 }),
  total:          numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  notes:          text("notes"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PACKAGES (Pacotes de serviÃ§os)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const packages = pgTable("packages", {
  id:              uuid("id").primaryKey().defaultRandom(),
  tenantId:        uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:        uuid("client_id").notNull().references(() => clients.id),
  name:            varchar("name", { length: 255 }).notNull(),
  totalSessions:   integer("total_sessions").notNull().default(1),
  usedSessions:    integer("used_sessions").notNull().default(0),
  remainingSessions: integer("remaining_sessions").notNull().default(1),
  totalValue:      numeric("total_value", { precision: 10, scale: 2 }).notNull(),
  amountPaid:      numeric("amount_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  status:          packageStatusEnum("status").notNull().default("active"),
  expiresAt:       timestamp("expires_at", { withTimezone: true }),
  services:        jsonb("services").notNull().default([]),
  notes:           text("notes"),
  ...audit,
}, (t) => ({
  tenantIdx: index("packages_tenant_idx").on(t.tenantId),
  clientIdx: index("packages_client_idx").on(t.clientId),
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GIFT CARDS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const giftCards = pgTable("gift_cards", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  code:          varchar("code", { length: 20 }).notNull(),
  initialValue:  numeric("initial_value", { precision: 10, scale: 2 }).notNull(),
  currentBalance: numeric("current_balance", { precision: 10, scale: 2 }).notNull(),
  status:        giftCardStatusEnum("status").notNull().default("active"),
  purchasedById: uuid("purchased_by_id").references(() => clients.id),
  usedById:      uuid("used_by_id").references(() => clients.id),
  expiresAt:     timestamp("expires_at", { withTimezone: true }),
  notes:         text("notes"),
  ...audit,
}, (t) => ({
  tenantCodeIdx: index("gift_cards_tenant_code_idx").on(t.tenantId, t.code),
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PRODUCTS & INVENTORY
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const productCategories = pgTable("product_categories", {
  id:        uuid("id").primaryKey().defaultRandom(),
  tenantId:  uuid("tenant_id").notNull().references(() => tenants.id),
  name:      varchar("name", { length: 100 }).notNull(),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  categoryId:    uuid("category_id").references(() => productCategories.id),
  supplierId:    uuid("supplier_id"),
  name:          varchar("name", { length: 255 }).notNull(),
  brand:         varchar("brand", { length: 100 }),
  sku:           varchar("sku", { length: 50 }),
  barcode:       varchar("barcode", { length: 50 }),
  description:   text("description"),
  salePrice:     numeric("sale_price", { precision: 10, scale: 2 }).notNull().default("0"),
  costPrice:     numeric("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
  commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  stockQty:      numeric("stock_qty", { precision: 10, scale: 2 }).notNull().default("0"),
  stockMinQty:   numeric("stock_min_qty", { precision: 10, scale: 2 }).notNull().default("0"),
  unit:          varchar("unit", { length: 20 }).notNull().default("un"),
  imageUrl:      text("image_url"),
  isActive:      boolean("is_active").notNull().default(true),
  isForSale:     boolean("is_for_sale").notNull().default(true),
  isForService:  boolean("is_for_service").notNull().default(false),
  ...audit,
}, (t) => ({
  tenantIdx: index("products_tenant_idx").on(t.tenantId),
  stockIdx:  index("products_stock_idx").on(t.stockQty),
}));

export const stockMovements = pgTable("stock_movements", {
  id:          uuid("id").primaryKey().defaultRandom(),
  tenantId:    uuid("tenant_id").notNull().references(() => tenants.id),
  productId:   uuid("product_id").notNull().references(() => products.id),
  type:        stockMovementEnum("type").notNull(),
  quantity:    numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitCost:    numeric("unit_cost", { precision: 10, scale: 2 }),
  reason:      text("reason"),
  referenceId: uuid("reference_id"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy:   uuid("created_by"),
});

export const suppliers = pgTable("suppliers", {
  id:        uuid("id").primaryKey().defaultRandom(),
  tenantId:  uuid("tenant_id").notNull().references(() => tenants.id),
  name:      varchar("name", { length: 255 }).notNull(),
  email:     varchar("email", { length: 255 }),
  phone:     varchar("phone", { length: 20 }),
  whatsapp:  varchar("whatsapp", { length: 20 }),
  cnpj:      varchar("cnpj", { length: 18 }),
  notes:     text("notes"),
  isActive:  boolean("is_active").notNull().default(true),
  ...audit,
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FINANCIAL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const financialAccounts = pgTable("financial_accounts", {
  id:        uuid("id").primaryKey().defaultRandom(),
  tenantId:  uuid("tenant_id").notNull().references(() => tenants.id),
  name:      varchar("name", { length: 100 }).notNull(),
  type:      varchar("type", { length: 20 }).notNull().default("checking"),
  balance:   numeric("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive:  boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const financialCategories = pgTable("financial_categories", {
  id:        uuid("id").primaryKey().defaultRandom(),
  tenantId:  uuid("tenant_id").notNull().references(() => tenants.id),
  name:      varchar("name", { length: 100 }).notNull(),
  type:      transactionTypeEnum("type").notNull(),
  color:     varchar("color", { length: 7 }),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const financialTransactions = pgTable("financial_transactions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id),
  accountId:      uuid("account_id").notNull().references(() => financialAccounts.id),
  categoryId:     uuid("category_id").references(() => financialCategories.id),
  type:           transactionTypeEnum("type").notNull(),
  status:         transactionStatusEnum("status").notNull().default("pending"),
  paymentMethod:  paymentMethodEnum("payment_method"),
  description:    varchar("description", { length: 500 }).notNull(),
  amount:         numeric("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate:        date("due_date").notNull(),
  paidAt:         timestamp("paid_at", { withTimezone: true }),
  competenceDate: date("competence_date"),
  appointmentId:  uuid("appointment_id").references(() => appointments.id),
  clientId:       uuid("client_id").references(() => clients.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  supplierId:     uuid("supplier_id").references(() => suppliers.id),
  notes:          text("notes"),
  tags:           text("tags").array().notNull().default(sql`'{}'::text[]`),
  isRecurring:    boolean("is_recurring").notNull().default(false),
  recurringRule:  jsonb("recurring_rule").notNull().default({}),
  ...audit,
}, (t) => ({
  tenantIdx:   index("transactions_tenant_idx").on(t.tenantId),
  dueDateIdx:  index("transactions_due_date_idx").on(t.dueDate),
  typeIdx:     index("transactions_type_idx").on(t.type),
  statusIdx:   index("transactions_status_idx").on(t.status),
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// COMMISSIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const commissions = pgTable("commissions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id),
  professionalId: uuid("professional_id").notNull().references(() => professionals.id),
  appointmentId:  uuid("appointment_id").references(() => appointments.id),
  transactionId:  uuid("transaction_id").references(() => financialTransactions.id),
  type:           commissionTypeEnum("type").notNull().default("percentage"),
  baseAmount:     numeric("base_amount", { precision: 10, scale: 2 }).notNull(),
  commissionPct:  numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  commissionAmt:  numeric("commission_amt", { precision: 10, scale: 2 }).notNull(),
  isPaid:         boolean("is_paid").notNull().default(false),
  paidAt:         timestamp("paid_at", { withTimezone: true }),
  referenceMonth: char("reference_month", { length: 7 }),
  notes:          text("notes"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx:       index("commissions_tenant_idx").on(t.tenantId),
  professionalIdx: index("commissions_professional_idx").on(t.professionalId),
  monthIdx:        index("commissions_month_idx").on(t.referenceMonth),
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GOALS (Metas)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const goals = pgTable("goals", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  title:          varchar("title", { length: 255 }).notNull(),
  targetAmount:   numeric("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount:  numeric("current_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  targetDate:     date("target_date").notNull(),
  status:         goalStatusEnum("status").notNull().default("active"),
  bonusAmount:    numeric("bonus_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes:          text("notes"),
  ...audit,
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// LOYALTY & REFERRALS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id:          uuid("id").primaryKey().defaultRandom(),
  tenantId:    uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:    uuid("client_id").notNull().references(() => clients.id),
  points:      integer("points").notNull(),
  type:        varchar("type", { length: 20 }).notNull(),
  description: varchar("description", { length: 255 }),
  referenceId: uuid("reference_id"),
  expiresAt:   timestamp("expires_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referrals = pgTable("referrals", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  referrerId:    uuid("referrer_id").notNull().references(() => clients.id),
  referredId:    uuid("referred_id").references(() => clients.id),
  status:        varchar("status", { length: 20 }).notNull().default("pending"),
  rewardPoints:  integer("reward_points").notNull().default(0),
  rewardAmount:  numeric("reward_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  convertedAt:   timestamp("converted_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CRM â€” LEADS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const leads = pgTable("leads", {
  id:          uuid("id").primaryKey().defaultRandom(),
  tenantId:    uuid("tenant_id").notNull().references(() => tenants.id),
  name:        varchar("name", { length: 255 }).notNull(),
  email:       varchar("email", { length: 255 }),
  phone:       varchar("phone", { length: 20 }),
  whatsapp:    varchar("whatsapp", { length: 20 }),
  source:      varchar("source", { length: 50 }),
  status:      leadStatusEnum("status").notNull().default("new"),
  serviceInterest: varchar("service_interest", { length: 255 }),
  estimatedValue: numeric("estimated_value", { precision: 10, scale: 2 }),
  notes:       text("notes"),
  convertedTo: uuid("converted_to").references(() => clients.id),
  assignedTo:  uuid("assigned_to").references(() => professionals.id),
  followUpAt:  timestamp("follow_up_at", { withTimezone: true }),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  ...audit,
}, (t) => ({
  tenantIdx: index("leads_tenant_idx").on(t.tenantId),
  statusIdx: index("leads_status_idx").on(t.status),
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CAMPAIGNS & COMMUNICATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const campaigns = pgTable("campaigns", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tenantId:     uuid("tenant_id").notNull().references(() => tenants.id),
  name:         varchar("name", { length: 255 }).notNull(),
  status:       campaignStatusEnum("status").notNull().default("draft"),
  channel:      notificationChannelEnum("channel").notNull().default("whatsapp"),
  subject:      varchar("subject", { length: 255 }),
  message:      text("message").notNull(),
  targetFilter: jsonb("target_filter").notNull().default({}),
  scheduledAt:  timestamp("scheduled_at", { withTimezone: true }),
  sentCount:    integer("sent_count").notNull().default(0),
  openCount:    integer("open_count").notNull().default(0),
  clickCount:   integer("click_count").notNull().default(0),
  ...audit,
});

// ─────────────────────────────────────────────────────────
// RECEPCAO AUTOMATICA (auto-reply WhatsApp)
// ─────────────────────────────────────────────────────────
export const autoReplySettings = pgTable("auto_reply_settings", {
  tenantId:      uuid("tenant_id").primaryKey().references(() => tenants.id),
  isEnabled:     boolean("is_enabled").notNull().default(false),
  linkTarget:    varchar("link_target", { length: 20 }).notNull().default("booking"),
  cooldownHours: integer("cooldown_hours").notNull().default(24),
  replyDelayMinSeconds: integer("reply_delay_min_seconds").notNull().default(5),
  replyDelayMaxSeconds: integer("reply_delay_max_seconds").notNull().default(8),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const autoReplyMessages = pgTable("auto_reply_messages", {
  id:        uuid("id").primaryKey().defaultRandom(),
  tenantId:  uuid("tenant_id").notNull().references(() => tenants.id),
  audience:  varchar("audience", { length: 20 }).notNull(), // 'existing_client' | 'new_contact'
  message:   text("message").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const autoReplyConversations = pgTable("auto_reply_conversations", {
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  contactPhone:  varchar("contact_phone", { length: 30 }).notNull(),
  lastMessageId: uuid("last_message_id").references(() => autoReplyMessages.id),
  lastRepliedAt: timestamp("last_replied_at", { withTimezone: true }),
}, (table) => ({
  pk: unique("auto_reply_conversations_pk").on(table.tenantId, table.contactPhone),
}));

export const messageTemplates = pgTable("message_templates", {
  id:        uuid("id").primaryKey().defaultRandom(),
  tenantId:  uuid("tenant_id").notNull().references(() => tenants.id),
  name:      varchar("name", { length: 100 }).notNull(),
  trigger:   varchar("trigger", { length: 50 }).notNull(),
  channel:   notificationChannelEnum("channel").notNull().default("whatsapp"),
  subject:   varchar("subject", { length: 255 }),
  message:   text("message").notNull(),
  isActive:  boolean("is_active").notNull().default(true),
  sendDelay: integer("send_delay").notNull().default(0),
  ...audit,
});

export const notifications = pgTable("notifications", {
  id:          uuid("id").primaryKey().defaultRandom(),
  tenantId:    uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:    uuid("client_id").references(() => clients.id),
  channel:     notificationChannelEnum("channel").notNull(),
  subject:     varchar("subject", { length: 255 }),
  message:     text("message").notNull(),
  status:      varchar("status", { length: 20 }).notNull().default("pending"),
  sentAt:      timestamp("sent_at", { withTimezone: true }),
  errorMsg:    text("error_msg"),
  referenceId: uuid("reference_id"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// REVIEWS (AvaliaÃ§Ãµes)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const reviews = pgTable("reviews", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:       uuid("client_id").notNull().references(() => clients.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  appointmentId:  uuid("appointment_id").references(() => appointments.id),
  rating:         integer("rating").notNull(),
  comment:        text("comment"),
  status:         reviewStatusEnum("status").notNull().default("pending"),
  isPublic:       boolean("is_public").notNull().default(false),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AUDIT LOGS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const auditLogs = pgTable("audit_logs", {
  id:        uuid("id").primaryKey().defaultRandom(),
  tenantId:  uuid("tenant_id").notNull().references(() => tenants.id),
  userId:    uuid("user_id"),
  action:    varchar("action", { length: 50 }).notNull(),
  tableName: varchar("table_name", { length: 50 }).notNull(),
  recordId:  uuid("record_id"),
  oldData:   jsonb("old_data"),
  newData:   jsonb("new_data"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx:  index("audit_tenant_idx").on(t.tenantId),
  tableIdx:   index("audit_table_idx").on(t.tableName),
  createdIdx: index("audit_created_idx").on(t.createdAt),
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// RELATIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ────────────────────────────────────────────────────────────
// VITRINE DIGITAL PREMIUM — adicionado via merge-drizzle-schema.sh
// ────────────────────────────────────────────────────────────

export const salonProfile = pgTable("salon_profiles", {
  id:               uuid("id").primaryKey().defaultRandom(),
  tenantId:         uuid("tenant_id").notNull().unique().references(() => tenants.id),
  tagline:          varchar("tagline", { length: 150 }),
  description:      text("description"),
  coverImageUrl:    text("cover_image_url"),
  instagramUrl:     varchar("instagram_url", { length: 300 }),
  whatsappNumber:   varchar("whatsapp_number", { length: 20 }),
  addressFull:      varchar("address_full", { length: 300 }),
  isPremiumEnabled: boolean("is_premium_enabled").notNull().default(false),
  ...audit,
}, (t) => ({
  tenantIdx: index("salon_profiles_tenant_idx").on(t.tenantId),
}));

export const portfolioImages = pgTable("portfolio_images", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  imageUrl:       text("image_url").notNull(),
  caption:        varchar("caption", { length: 200 }),
  category:       varchar("category", { length: 50 }),
  sortOrder:      integer("sort_order").notNull().default(0),
  ...audit,
}, (t) => ({
  tenantIdx: index("portfolio_images_tenant_idx").on(t.tenantId),
  professionalIdx: index("portfolio_images_professional_idx").on(t.professionalId),
}));

export const promotionDiscountTypeEnum = pgEnum("promotion_discount_type", ["percentage", "fixed_amount"]);

export const promotions = pgTable("promotions", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  title:         varchar("title", { length: 150 }).notNull(),
  description:   text("description"),
  discountType:  promotionDiscountTypeEnum("discount_type").notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  validFrom:     timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil:    timestamp("valid_until", { withTimezone: true }).notNull(),
  isActive:      boolean("is_active").notNull().default(true),
  ...audit,
}, (t) => ({
  tenantIdx: index("promotions_tenant_idx").on(t.tenantId),
}));

export const salonProfileRelations = relations(salonProfile, ({ one }) => ({
  tenant: one(tenants, { fields: [salonProfile.tenantId], references: [tenants.id] }),
}));

export const portfolioImagesRelations = relations(portfolioImages, ({ one }) => ({
  tenant: one(tenants, { fields: [portfolioImages.tenantId], references: [tenants.id] }),
  professional: one(professionals, { fields: [portfolioImages.professionalId], references: [professionals.id] }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  tenant: one(tenants, { fields: [promotions.tenantId], references: [tenants.id] }),
}));


export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  userProfiles: many(userProfiles),
  professionals: many(professionals),
  salonProfile: one(salonProfile),
  portfolioImages: many(portfolioImages),
  promotions: many(promotions),
  clients: many(clients),
  appointments: many(appointments),
  services: many(services),
  products: many(products),
  financialTransactions: many(financialTransactions),
  commissions: many(commissions),
  campaigns: many(campaigns),
  leads: many(leads),
}));

export const professionalsRelations = relations(professionals, ({ one, many }) => ({
  tenant: one(tenants, { fields: [professionals.tenantId], references: [tenants.id] }),
  userProfile: one(userProfiles, { fields: [professionals.userProfileId], references: [userProfiles.id] }),
  appointments: many(appointments),
  commissions: many(commissions),
  goals: many(goals),
  reviews: many(reviews),
  portfolioImages: many(portfolioImages),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, { fields: [clients.tenantId], references: [tenants.id] }),
  appointments: many(appointments),
  packages: many(packages),
  loyaltyTransactions: many(loyaltyTransactions),
  reviews: many(reviews),
  referrals: many(referrals),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [appointments.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [appointments.clientId], references: [clients.id] }),
  professional: one(professionals, { fields: [appointments.professionalId], references: [professionals.id] }),
  services: many(appointmentServices),
  commissions: many(commissions),
  reviews: many(reviews),
}));

// ─── PASSWORD RESETS (token customizado) ────────────────────────────────────
export const passwordResets = pgTable("password_resets", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull(),
  token:     text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt:    timestamp("used_at",    { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ═════════════════════════════════════════════════════════════════════════════
// BASELINE — tabelas que já existiam só no banco de produção (criadas à mão).
// Definições copiadas do dump real (56 tabelas). Ficam de fora do Drizzle, mas
// continuam no banco: sessoes_salao, atendimentos_humanos, bot_mensagens_log,
// configuracoes (bot n8n), prospect_campaigns e subscriptions.
// ═════════════════════════════════════════════════════════════════════════════

// ─── AGENDA DO PROFISSIONAL ─────────────────────────────────────────────────
export const professionalSchedules = pgTable("professional_schedules", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  professionalId: uuid("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
  dayOfWeek:      integer("day_of_week").notNull(), // CHECK 0..6
  isWorking:      boolean("is_working").notNull().default(true),
  startTime:      varchar("start_time", { length: 5 }).notNull().default("08:00"),
  endTime:        varchar("end_time", { length: 5 }).notNull().default("18:00"),
  slotMinutes:    integer("slot_minutes").notNull().default(30),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  breakStart:     varchar("break_start", { length: 5 }),
  breakEnd:       varchar("break_end", { length: 5 }),
}, (t) => ({
  profDayUnique: unique("professional_schedules_prof_day_unique").on(t.professionalId, t.dayOfWeek),
  professionalIdx: index("professional_schedules_professional_id_idx").on(t.professionalId),
  tenantIdx:     index("professional_schedules_tenant_id_idx").on(t.tenantId),
}));

export const professionalBlocks = pgTable("professional_blocks", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  professionalId: uuid("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
  startsAt:       timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt:         timestamp("ends_at", { withTimezone: true }).notNull(),
  reason:         text("reason"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  professionalIdx: index("professional_blocks_professional_id_idx").on(t.professionalId),
  periodIdx:     index("professional_blocks_starts_at_ends_at_idx").on(t.startsAt, t.endsAt),
  tenantIdx:     index("professional_blocks_tenant_id_idx").on(t.tenantId),
}));

export const professionalServices = pgTable("professional_services", {
  id:              uuid("id").primaryKey().defaultRandom(),
  tenantId:        uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  professionalId:  uuid("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
  serviceId:       uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  commissionType:  varchar("commission_type", { length: 10 }).notNull().default("percent"), // CHECK 'percent' | 'fixed'
  commissionValue: numeric("commission_value", { precision: 10, scale: 2 }).notNull().default(sql`0`),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  isEnabled:       boolean("is_enabled").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  profServiceUnique: unique("professional_services_professional_id_service_id_key").on(t.professionalId, t.serviceId),
  professionalIdx: index("professional_services_professional_id_idx").on(t.professionalId),
  serviceIdx:      index("professional_services_service_id_idx").on(t.serviceId),
  tenantIdx:       index("professional_services_tenant_id_idx").on(t.tenantId),
}));

// ─── AUTOMAÇÕES, PLANOS E ASSINATURA ────────────────────────────────────────
export const automationSettings = pgTable("automation_settings", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  tenantId:            uuid("tenant_id").notNull().unique("automation_settings_tenant_id_key").references(() => tenants.id),
  reminder24hEnabled:  boolean("reminder_24h_enabled").notNull().default(true),
  reminder24hHours:    integer("reminder_24h_hours").notNull().default(24),
  reminder2hEnabled:   boolean("reminder_2h_enabled").notNull().default(true),
  reminder2hHours:     integer("reminder_2h_hours").notNull().default(2),
  birthdayEnabled:     boolean("birthday_enabled").notNull().default(true),
  birthdayHour:        integer("birthday_hour").notNull().default(9),
  reactivationEnabled: boolean("reactivation_enabled").notNull().default(true),
  reactivationDays:    integer("reactivation_days").notNull().default(30),
  postServiceEnabled:  boolean("post_service_enabled").notNull().default(true),
  postServiceHours:    integer("post_service_hours").notNull().default(2),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planSettings = pgTable("plan_settings", {
  id:          uuid("id").primaryKey().defaultRandom(),
  key:         varchar("key", { length: 100 }).notNull().unique("plan_settings_key_key"),
  value:       jsonb("value").notNull(),
  description: text("description"),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const subscriptionNotifications = pgTable("subscription_notifications", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // FK para public.subscriptions (tabela fora do Drizzle), ON DELETE CASCADE
  subscriptionId: uuid("subscription_id").notNull(),
  type:           varchar("type", { length: 30 }).notNull(), // CHECK expiring_7d|expiring_3d|expiring_1d|expired|renewed|upgraded|canceled
  sentAt:         timestamp("sent_at", { withTimezone: true }).defaultNow(),
  channel:        varchar("channel", { length: 10 }).default("email"),
}, (t) => ({
  tenantIdx: index("idx_sub_notifications_tenant").on(t.tenantId),
}));

// ─── FOTOS DE ATENDIMENTO ───────────────────────────────────────────────────
export const appointmentPhotos = pgTable("appointment_photos", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:      uuid("client_id").notNull().references(() => clients.id),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  type:          varchar("type", { length: 20 }).notNull().default("before"),
  storagePath:   text("storage_path").notNull(),
  publicUrl:     text("public_url"),
  description:   text("description"),
  takenAt:       timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy:     uuid("created_by"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  appointmentIdx: index("appointment_photos_appointment_idx").on(t.appointmentId),
  clientIdx:      index("appointment_photos_client_idx").on(t.clientId),
  tenantIdx:      index("appointment_photos_tenant_idx").on(t.tenantId),
}));

// ─── CLÍNICA ESTÉTICA ───────────────────────────────────────────────────────
export const clientRecords = pgTable("client_records", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  tenantId:              uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:              uuid("client_id").notNull().references(() => clients.id),
  type:                  varchar("type", { length: 50 }).notNull().default("anamnesis"),
  allergies:             text("allergies").array().notNull().default(sql`'{}'::text[]`),
  medications:           text("medications"),
  medicalHistory:        text("medical_history"),
  previousProcedures:    text("previous_procedures"),
  skinType:              varchar("skin_type", { length: 50 }),
  contraindications:     text("contraindications"),
  notes:                 text("notes"),
  createdBy:             uuid("created_by"),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  mainComplaint:         text("main_complaint"),
  aestheticHistory:      text("aesthetic_history"),
  pregnancy:             boolean("pregnancy").default(false),
  preExistingConditions: text("pre_existing_conditions"),
  clinicalObservations:  text("clinical_observations"),
  treatmentEvolution:    text("treatment_evolution"),
}, (t) => ({
  clientIdx: index("client_records_client_idx").on(t.clientId),
  tenantIdx: index("client_records_tenant_idx").on(t.tenantId),
}));

export const consentForms = pgTable("consent_forms", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tenantId:     uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:     uuid("client_id").notNull().references(() => clients.id),
  type:         varchar("type", { length: 50 }).notNull().default("lgpd"),
  content:      text("content"),
  signedAt:     timestamp("signed_at", { withTimezone: true }),
  signedByName: varchar("signed_by_name", { length: 255 }),
  ipAddress:    varchar("ip_address", { length: 45 }),
  isSigned:     boolean("is_signed").notNull().default(false),
  expiresAt:    timestamp("expires_at", { withTimezone: true }),
  createdBy:    uuid("created_by"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  clientIdx: index("consent_forms_client_idx").on(t.clientId),
  tenantIdx: index("consent_forms_tenant_idx").on(t.tenantId),
}));

export const protocols = pgTable("protocols", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  name:          varchar("name", { length: 255 }).notNull(),
  description:   text("description"),
  serviceId:     uuid("service_id").references(() => services.id),
  isActive:      boolean("is_active").notNull().default(true),
  createdBy:     uuid("created_by"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  totalSessions: integer("total_sessions").default(1),
  intervalDays:  integer("interval_days").default(7),
  nicho:         varchar("nicho").default("clinic"),
}, (t) => ({
  tenantIdx: index("protocols_tenant_idx").on(t.tenantId),
}));

export const protocolSteps = pgTable("protocol_steps", {
  id:              uuid("id").primaryKey().defaultRandom(),
  tenantId:        uuid("tenant_id").notNull().references(() => tenants.id),
  protocolId:      uuid("protocol_id").notNull().references(() => protocols.id, { onDelete: "cascade" }),
  title:           varchar("title", { length: 255 }).notNull(),
  description:     text("description"),
  durationMinutes: integer("duration_minutes").default(0),
  sortOrder:       integer("sort_order").notNull().default(0),
  isRequired:      boolean("is_required").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  protocolIdx: index("protocol_steps_protocol_idx").on(t.protocolId),
}));

export const protocolSessions = pgTable("protocol_sessions", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:      uuid("client_id").notNull().references(() => clients.id),
  protocolId:    uuid("protocol_id").notNull().references(() => protocols.id),
  sessionNumber: integer("session_number").notNull().default(1),
  performedAt:   timestamp("performed_at", { withTimezone: true }),
  performedBy:   uuid("performed_by").references(() => professionals.id),
  evolution:     text("evolution"),
  observations:  text("observations"),
  status:        varchar("status").notNull().default("scheduled"),
  createdBy:     uuid("created_by"),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
  clientIdx: index("idx_protocol_sessions_client").on(t.clientId),
  tenantIdx: index("idx_protocol_sessions_tenant").on(t.tenantId),
}));

export const treatmentPackages = pgTable("treatment_packages", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  name:          varchar("name").notNull(),
  description:   text("description"),
  protocolId:    uuid("protocol_id").references(() => protocols.id),
  totalSessions: integer("total_sessions").notNull().default(5),
  validityDays:  integer("validity_days").default(365),
  price:         numeric("price", { precision: 10, scale: 2 }).default(sql`0`),
  isActive:      boolean("is_active").default(true),
  createdBy:     uuid("created_by"),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
  tenantIdx: index("idx_treatment_packages_tenant").on(t.tenantId),
}));

export const packageSessions = pgTable("package_sessions", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  tenantId:           uuid("tenant_id").notNull().references(() => tenants.id),
  clientId:           uuid("client_id").notNull().references(() => clients.id),
  packageId:          uuid("package_id").notNull().references(() => treatmentPackages.id),
  sessionsContracted: integer("sessions_contracted").notNull().default(0),
  sessionsUsed:       integer("sessions_used").notNull().default(0),
  // No banco: GENERATED ALWAYS AS (sessions_contracted - sessions_used) STORED.
  // O drizzle-orm 0.29 não declara coluna gerada: só leitura, nunca gravar.
  sessionsRemaining:  integer("sessions_remaining"),
  startedAt:          timestamp("started_at", { withTimezone: true }).defaultNow(),
  expiresAt:          timestamp("expires_at", { withTimezone: true }),
  status:             varchar("status").notNull().default("active"),
  createdBy:          uuid("created_by"),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
  clientIdx: index("idx_package_sessions_client").on(t.clientId),
  tenantIdx: index("idx_package_sessions_tenant").on(t.tenantId),
}));

// ─── PROSPECÇÃO (super-admin, sem tenant_id) ────────────────────────────────
export const prospectLeads = pgTable("prospect_leads", {
  id:             uuid("id").primaryKey().defaultRandom(),
  state:          varchar("state", { length: 10 }),
  city:           varchar("city", { length: 100 }),
  niche:          varchar("niche", { length: 100 }).notNull(),
  businessName:   varchar("business_name", { length: 255 }).notNull(),
  phone:          varchar("phone", { length: 30 }),
  email:          varchar("email", { length: 255 }),
  website:        varchar("website", { length: 255 }),
  address:        text("address"),
  type:           varchar("type", { length: 100 }),
  rating:         numeric("rating", { precision: 3, scale: 1 }),
  reviewCount:    integer("review_count"),
  googleMapsLink: text("google_maps_link"),
  status:         varchar("status", { length: 20 }).notNull().default("pending"),
  sentCount:      integer("sent_count").notNull().default(0),
  lastSentAt:     timestamp("last_sent_at", { withTimezone: true }),
  notes:          text("notes"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
  nicheIdx:  index("idx_prospect_leads_niche").on(t.niche),
  phoneIdx:  index("idx_prospect_leads_phone").on(t.phone),
  statusIdx: index("idx_prospect_leads_status").on(t.status),
}));

export const prospectTemplates = pgTable("prospect_templates", {
  id:        uuid("id").primaryKey().defaultRandom(),
  niche:     varchar("niche", { length: 100 }).notNull(),
  name:      varchar("name", { length: 100 }).notNull(),
  message:   text("message").notNull(),
  isActive:  boolean("is_active").notNull().default(true),
  sentCount: integer("sent_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── PILATES (Fase 2): alunos, planos e matrículas ─────────────────────────
// Alunos, instrutores e modalidades reaproveitam clients, professionals e services.
// Migration: 0004_pilates_base.sql (CHECKs de nível, status, tipo de plano etc. ficam no banco).

export const pilatesStudentProfiles = pgTable("pilates_student_profiles", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  tenantId:              uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientId:              uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  goal:                  text("goal"),
  level:                 varchar("level", { length: 20 }).notNull().default("beginner"), // beginner | intermediate | advanced
  startDate:             date("start_date"),
  weeklyFrequency:       integer("weekly_frequency"),
  status:                varchar("status", { length: 20 }).notNull().default("active"), // active | paused | inactive | cancelled
  instructorId:          uuid("instructor_id").references(() => professionals.id, { onDelete: "set null" }),
  notes:                 text("notes"),
  emergencyContactName:  varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  initialAssessmentDate: date("initial_assessment_date"),
  declaredRestrictions:  text("declared_restrictions"), // "Restrições e cuidados informados pelo aluno" (C8)
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  clientUnique:    unique("pilates_student_profiles_client_unique").on(t.clientId),
  tenantStatusIdx: index("pilates_student_profiles_tenant_status_idx").on(t.tenantId, t.status),
}));

export const pilatesPlans = pgTable("pilates_plans", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name:           varchar("name", { length: 255 }).notNull(),
  description:    text("description"),
  kind:           varchar("kind", { length: 20 }).notNull(), // frequency | package
  price:          numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  classesPerWeek: integer("classes_per_week"), // frequency
  durationMonths: integer("duration_months"),  // frequency: vigência (1, 3, 6...)
  totalClasses:   integer("total_classes"),    // package
  validityDays:   integer("validity_days"),    // package
  modalityId:     uuid("modality_id").references(() => services.id, { onDelete: "set null" }),
  isTrial:        boolean("is_trial").notNull().default(false),
  status:         varchar("status", { length: 20 }).notNull().default("active"), // active | inactive
  // Exceções de regra deste plano (NULL = padrão do studio em pilates_settings). Migration 0005.
  allowIndividualSlot:             boolean("allow_individual_slot"),
  individualSlotCapacity:          integer("individual_slot_capacity"),
  cancelDeadlineEnabled:           boolean("cancel_deadline_enabled"),
  cancelMinHours:                  integer("cancel_min_hours"),
  makeupEnabled:                   boolean("makeup_enabled"),
  makeupValidityDays:              integer("makeup_validity_days"),
  makeupMonthlyLimitEnabled:       boolean("makeup_monthly_limit_enabled"),
  makeupMaxPerMonth:               integer("makeup_max_per_month"),
  unexcusedAbsenceConsumesCredit:  boolean("unexcused_absence_consumes_credit"),
  unexcusedAbsenceGeneratesMakeup: boolean("unexcused_absence_generates_makeup"),
  excusedAbsenceGeneratesMakeup:   boolean("excused_absence_generates_makeup"),
  excusedAbsenceConsumesCredit:    boolean("excused_absence_consumes_credit"),
  timelyCancelGeneratesMakeup:     boolean("timely_cancel_generates_makeup"),
  lateCancelConsumesCredit:        boolean("late_cancel_consumes_credit"),
  studioCancelAction:              varchar("studio_cancel_action", { length: 20 }),
  pauseEnabled:                    boolean("pause_enabled"),
  pauseMaxDays:                    integer("pause_max_days"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantStatusIdx: index("pilates_plans_tenant_status_idx").on(t.tenantId, t.status),
}));

export const pilatesEnrollments = pgTable("pilates_enrollments", {
  id:        uuid("id").primaryKey().defaultRandom(),
  tenantId:  uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientId:  uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  planId:    uuid("plan_id").notNull().references(() => pilatesPlans.id, { onDelete: "restrict" }),
  startDate: date("start_date").notNull(),
  endDate:   date("end_date"),
  dueDay:    integer("due_day"),
  price:     numeric("price", { precision: 10, scale: 2 }).notNull(),
  status:    varchar("status", { length: 20 }).notNull().default("active"), // active | paused | ended | cancelled
  notes:     text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantStatusIdx: index("pilates_enrollments_tenant_status_idx").on(t.tenantId, t.status),
  clientIdx:       index("pilates_enrollments_client_idx").on(t.clientId),
  planIdx:         index("pilates_enrollments_plan_idx").on(t.planId),
}));

// ─── PILATES (Fase 3): regras, grade, aulas, horários fixos, inscrições, reposições, pausas ──
// Migration: 0005_pilates_classes.sql (CHECKs e índices únicos ficam no banco).

export const pilatesSettings = pgTable("pilates_settings", {
  id:                              uuid("id").primaryKey().defaultRandom(),
  tenantId:                        uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  allowIndividualSlot:             boolean("allow_individual_slot").notNull().default(true),
  individualSlotCapacity:          integer("individual_slot_capacity").notNull().default(1),
  cancelDeadlineEnabled:           boolean("cancel_deadline_enabled").notNull().default(true),
  cancelMinHours:                  integer("cancel_min_hours").notNull().default(12),
  makeupEnabled:                   boolean("makeup_enabled").notNull().default(true),
  makeupValidityDays:              integer("makeup_validity_days").notNull().default(30),
  makeupMonthlyLimitEnabled:       boolean("makeup_monthly_limit_enabled").notNull().default(true),
  makeupMaxPerMonth:               integer("makeup_max_per_month").notNull().default(2),
  unexcusedAbsenceConsumesCredit:  boolean("unexcused_absence_consumes_credit").notNull().default(true),
  unexcusedAbsenceGeneratesMakeup: boolean("unexcused_absence_generates_makeup").notNull().default(false),
  excusedAbsenceGeneratesMakeup:   boolean("excused_absence_generates_makeup").notNull().default(true),
  excusedAbsenceConsumesCredit:    boolean("excused_absence_consumes_credit").notNull().default(false),
  timelyCancelGeneratesMakeup:     boolean("timely_cancel_generates_makeup").notNull().default(true),
  lateCancelConsumesCredit:        boolean("late_cancel_consumes_credit").notNull().default(true),
  studioCancelActionPackage:       varchar("studio_cancel_action_package", { length: 20 }).notNull().default("refund_credit"),
  studioCancelActionFrequency:     varchar("studio_cancel_action_frequency", { length: 20 }).notNull().default("generate_makeup"),
  pauseEnabled:                    boolean("pause_enabled").notNull().default(true),
  pauseMaxDays:                    integer("pause_max_days").notNull().default(30),
  instructorAttendanceScope:       varchar("instructor_attendance_scope", { length: 10 }).notNull().default("own"),
  instructorEditWindowHours:       integer("instructor_edit_window_hours").notNull().default(24),
  defaultClassDuration:            integer("default_class_duration").notNull().default(50),
  defaultClassCapacity:            integer("default_class_capacity").notNull().default(4),
  createdAt:                       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ tenantUnique: unique("pilates_settings_tenant_unique").on(t.tenantId) }));

export const pilatesClassSchedules = pgTable("pilates_class_schedules", {
  id:                uuid("id").primaryKey().defaultRandom(),
  tenantId:          uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  modalityId:        uuid("modality_id").references(() => services.id, { onDelete: "set null" }),
  instructorId:      uuid("instructor_id").notNull().references(() => professionals.id),
  dayOfWeek:         integer("day_of_week").notNull(),                 // 0 = domingo
  startTime:         varchar("start_time", { length: 5 }).notNull(),   // HH:MM (horário de Brasília)
  durationMinutes:   integer("duration_minutes").notNull(),
  room:              varchar("room", { length: 100 }),
  capacity:          integer("capacity").notNull(),
  classType:         varchar("class_type", { length: 20 }).notNull().default("group"), // individual | duo | group
  isActive:          boolean("is_active").notNull().default(true),
  ownerEnrollmentId: uuid("owner_enrollment_id").references(() => pilatesEnrollments.id, { onDelete: "set null" }),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pilatesClassSessions = pgTable("pilates_class_sessions", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tenantId:     uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  scheduleId:   uuid("schedule_id").references(() => pilatesClassSchedules.id, { onDelete: "set null" }),
  sessionDate:  date("session_date").notNull(),
  startsAt:     timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt:       timestamp("ends_at", { withTimezone: true }).notNull(),
  instructorId: uuid("instructor_id").notNull().references(() => professionals.id),
  modalityId:   uuid("modality_id").references(() => services.id, { onDelete: "set null" }),
  room:         varchar("room", { length: 100 }),
  capacity:     integer("capacity").notNull(),
  classType:    varchar("class_type", { length: 20 }).notNull().default("group"), // + assessment
  status:       varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled | cancelled
  instructorOverridden: boolean("instructor_overridden").notNull().default(false),
  notes:        text("notes"),
  cancelReason: varchar("cancel_reason", { length: 255 }),
  cancelledAt:  timestamp("cancelled_at", { withTimezone: true }),
  cancelledBy:  uuid("cancelled_by"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pilatesEnrollmentSlots = pgTable("pilates_enrollment_slots", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tenantId:     uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  enrollmentId: uuid("enrollment_id").notNull().references(() => pilatesEnrollments.id, { onDelete: "cascade" }),
  scheduleId:   uuid("schedule_id").notNull().references(() => pilatesClassSchedules.id, { onDelete: "cascade" }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pilatesMakeupCredits = pgTable("pilates_makeup_credits", {
  id:              uuid("id").primaryKey().defaultRandom(),
  tenantId:        uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientId:        uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  enrollmentId:    uuid("enrollment_id").references(() => pilatesEnrollments.id, { onDelete: "set null" }),
  originBookingId: uuid("origin_booking_id"),
  reason:          varchar("reason", { length: 30 }).notNull(), // timely_cancel | excused_absence | unexcused_absence | studio_cancel
  expiresOn:       date("expires_on").notNull(),
  status:          varchar("status", { length: 20 }).notNull().default("available"), // available | used | expired
  usedBookingId:   uuid("used_booking_id"),
  usedAt:          timestamp("used_at", { withTimezone: true }),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pilatesBookings = pgTable("pilates_bookings", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  tenantId:            uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  sessionId:           uuid("session_id").notNull().references(() => pilatesClassSessions.id, { onDelete: "cascade" }),
  clientId:            uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  enrollmentId:        uuid("enrollment_id").references(() => pilatesEnrollments.id, { onDelete: "set null" }),
  kind:                varchar("kind", { length: 20 }).notNull(), // fixed | credit | makeup
  status:              varchar("status", { length: 20 }).notNull().default("booked"),
  creditConsumed:      boolean("credit_consumed").notNull().default(false),
  makeupCreditId:      uuid("makeup_credit_id").references(() => pilatesMakeupCredits.id, { onDelete: "set null" }),
  attendanceMarkedBy:  uuid("attendance_marked_by"),
  attendanceMarkedAt:  timestamp("attendance_marked_at", { withTimezone: true }),
  attendanceUpdatedBy: uuid("attendance_updated_by"),
  attendanceUpdatedAt: timestamp("attendance_updated_at", { withTimezone: true }),
  cancelledBy:         uuid("cancelled_by"),
  cancelledAt:         timestamp("cancelled_at", { withTimezone: true }),
  notes:               text("notes"),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pilatesPlanPauses = pgTable("pilates_plan_pauses", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tenantId:     uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  enrollmentId: uuid("enrollment_id").notNull().references(() => pilatesEnrollments.id, { onDelete: "cascade" }),
  startDate:    date("start_date").notNull(),
  endDate:      date("end_date").notNull(),
  days:         integer("days").notNull(),
  reason:       varchar("reason", { length: 200 }),
  createdBy:    uuid("created_by"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
