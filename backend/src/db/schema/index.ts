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

export const tenantsRelations = relations(tenants, ({ many }) => ({
  userProfiles: many(userProfiles),
  professionals: many(professionals),
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


