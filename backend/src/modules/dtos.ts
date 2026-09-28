// DTOs das rotas de escrita de all-modules.ts.
// Só entram os campos editáveis pelo usuário: tenantId, id, createdBy/updatedBy,
// deletedAt, version e totais/contadores calculados ficam de fora. Campos
// desconhecidos são descartados (zod strip), então o frontend pode mandar extras.

import { z } from "zod";
import {
  appointmentStatusEnum, paymentMethodEnum, commissionTypeEnum,
  transactionTypeEnum, transactionStatusEnum, goalStatusEnum,
  leadStatusEnum, campaignStatusEnum, notificationChannelEnum,
} from "@db/schema/index";

// ─── helpers ────────────────────────────────────────────────────────────────
const blank = (v: unknown) => v === "" || v === undefined;

/** Coluna NOT NULL com default: "" / null viram "não informado". */
const opt = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (blank(v) || v === null ? undefined : v), s.optional());

/** Coluna nullable: "" vira null. */
const nul = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (v === "" ? null : v), s.nullable().optional());

const str   = (max: number) => z.string().max(max);
const name  = (max: number) => z.string().trim().min(1).max(max);
const id    = z.string().uuid();
const int   = z.coerce.number().int();
const money = z.coerce.number().finite().transform(String); // numeric do Drizzle é string
const ts    = z.union([z.string().min(1), z.date()]).pipe(z.coerce.date());
const day   = z.string().regex(/^\d{4}-\d{2}-\d{2}/, "use AAAA-MM-DD").transform((s) => s.slice(0, 10));
const tags  = z.array(z.string().max(100));
const json  = z.record(z.any());
const list  = z.array(z.any());
const enumOf = <T extends [string, ...string[]]>(e: { enumValues: T }) => z.enum(e.enumValues);

/** Valida req.body; em caso de erro responde 400 e devolve undefined. */
export function parseBody<T extends z.ZodTypeAny>(schema: T, req: any, reply: any): z.infer<T> | undefined {
  const r = schema.safeParse(req.body ?? {});
  if (r.success) return r.data;
  const detail = r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
  reply.status(400).send({ success: false, error: `Dados invalidos (${detail})` });
  return undefined;
}

// ─── clients ────────────────────────────────────────────────────────────────
// Fora: segment, loyaltyTier, loyaltyPoints, cashbackBalance, totalSpent,
// totalVisits, averageTicket, *VisitAt, nextAppointmentAt, noShowCount, cancellationCount.
export const clientCreateDto = z.object({
  fullName:                name(255),
  displayName:             nul(str(100)),
  email:                   nul(str(255)),
  phone:                   nul(str(20)),
  whatsapp:                nul(str(20)),
  gender:                  nul(str(20)),
  birthDate:               nul(day),
  cpf:                     nul(str(14)),
  avatarUrl:               nul(z.string()),
  preferredProfessionalId: nul(id),
  acceptsMarketing:        opt(z.boolean()),
  acceptsWhatsapp:         opt(z.boolean()),
  acceptsSms:              opt(z.boolean()),
  isVip:                   opt(z.boolean()),
  isBlocked:               opt(z.boolean()),
  blockedReason:           nul(z.string()),
  notes:                   nul(z.string()),
  hairProfile:             opt(json),
  skinProfile:             opt(json),
  allergies:               opt(tags),
  tags:                    opt(tags),
  source:                  nul(str(50)),
  referredById:            nul(id),
  addressCity:             nul(str(100)),
  addressState:            nul(z.string().length(2)),
  customFields:            opt(json),
  isActive:                opt(z.boolean()),
});
export const clientUpdateDto = clientCreateDto.partial();

// ─── professionals ──────────────────────────────────────────────────────────
// Fora: userProfileId (vínculo com login é feito pelo módulo de equipe).
export const professionalCreateDto = z.object({
  fullName:             name(255),
  displayName:          nul(str(100)),
  email:                nul(str(255)),
  phone:                nul(str(20)),
  whatsapp:             nul(str(20)),
  avatarUrl:            nul(z.string()),
  bio:                  nul(z.string()),
  specialties:          opt(tags),
  commissionType:       opt(enumOf(commissionTypeEnum)),
  commissionPct:        opt(money),
  commissionFixed:      opt(money),
  commissionTiers:      opt(list),
  isActive:             opt(z.boolean()),
  acceptsOnlineBooking: opt(z.boolean()),
  color:                nul(str(7)),
  workingHours:         opt(json),
  breakTimes:           opt(list),
  sortOrder:            opt(int),
  monthlyGoal:          opt(money),
});
export const professionalUpdateDto = professionalCreateDto.partial();

// ─── appointments ───────────────────────────────────────────────────────────
// Fora: amountPaid, paymentStatus, confirmedAt/checkinAt/checkoutAt/cancelledAt,
// reminderSentAt (mudam pelas rotas de ação) e commissionAmt dos itens.
// totalPrice/subtotal continuam: são o valor digitado na tela de agendamento.
const appointmentItemDto = z.object({
  serviceId:       id,
  professionalId:  nul(id),
  price:           opt(money),
  durationMinutes: opt(int),
  commissionPct:   nul(money),
  total:           opt(money),
  notes:           nul(z.string()),
});

const appointmentFields = {
  clientId:           id,
  professionalId:     nul(id),
  status:             opt(enumOf(appointmentStatusEnum)),
  scheduledAt:        ts,
  endsAt:             ts,
  durationMinutes:    opt(int),
  subtotal:           opt(money),
  discountAmount:     opt(money),
  discountReason:     nul(str(255)),
  totalPrice:         opt(money),
  paymentMethod:      nul(enumOf(paymentMethodEnum)),
  packageId:          nul(id),
  giftCardId:         nul(id),
  internalNotes:      nul(z.string()),
  clientNotes:        nul(z.string()),
  source:             opt(str(50)),
};
export const appointmentCreateDto = z.object({
  ...appointmentFields,
  services: z.array(appointmentItemDto).optional(),
});
export const appointmentUpdateDto = z.object({
  ...appointmentFields,
  cancellationReason: nul(z.string()),
}).partial();

// ─── services ───────────────────────────────────────────────────────────────
export const serviceCreateDto = z.object({
  categoryId:       nul(id),
  name:             name(255),
  description:      nul(z.string()),
  durationMinutes:  opt(int),
  price:            opt(money),
  priceMin:         nul(money),
  priceMax:         nul(money),
  commissionPct:    nul(money),
  isActive:         opt(z.boolean()),
  isOnlineBookable: opt(z.boolean()),
  requiresDeposit:  opt(z.boolean()),
  depositAmount:    nul(money),
  imageUrl:         nul(z.string()),
  sortOrder:        opt(int),
});
export const serviceUpdateDto = serviceCreateDto.partial();

// ─── financial ──────────────────────────────────────────────────────────────
export const financialCreateDto = z.object({
  accountId:      id,
  categoryId:     nul(id),
  type:           enumOf(transactionTypeEnum),
  status:         opt(enumOf(transactionStatusEnum)),
  paymentMethod:  nul(enumOf(paymentMethodEnum)),
  description:    name(500),
  amount:         money,
  dueDate:        day,
  paidAt:         nul(ts),
  competenceDate: nul(day),
  appointmentId:  nul(id),
  clientId:       nul(id),
  professionalId: nul(id),
  supplierId:     nul(id),
  notes:          nul(z.string()),
  tags:           opt(tags),
  isRecurring:    opt(z.boolean()),
  recurringRule:  opt(json),
});
export const financialUpdateDto = financialCreateDto.partial();

// ─── goals ──────────────────────────────────────────────────────────────────
// Fora: currentAmount.
export const goalCreateDto = z.object({
  professionalId: nul(id),
  title:          name(255),
  targetAmount:   money,
  targetDate:     day,
  status:         opt(enumOf(goalStatusEnum)),
  bonusAmount:    opt(money),
  notes:          nul(z.string()),
});

// ─── leads ──────────────────────────────────────────────────────────────────
// Fora: convertedTo, convertedAt (definidos por POST /leads/:id/convert).
export const leadCreateDto = z.object({
  name:            name(255),
  email:           nul(str(255)),
  phone:           nul(str(20)),
  whatsapp:        nul(str(20)),
  source:          nul(str(50)),
  status:          opt(enumOf(leadStatusEnum)),
  serviceInterest: nul(str(255)),
  estimatedValue:  nul(money),
  notes:           nul(z.string()),
  assignedTo:      nul(id),
  followUpAt:      nul(ts),
});
export const leadUpdateDto = leadCreateDto.partial();

// ─── campaigns ──────────────────────────────────────────────────────────────
// Fora: sentCount, openCount, clickCount.
export const campaignCreateDto = z.object({
  name:         name(255),
  status:       opt(enumOf(campaignStatusEnum)),
  channel:      opt(enumOf(notificationChannelEnum)),
  subject:      nul(str(255)),
  message:      z.string().min(1),
  targetFilter: opt(json),
  scheduledAt:  nul(ts),
});

// ─── products ───────────────────────────────────────────────────────────────
// Fora: stockQty (só muda por POST /stock-movements).
export const productCreateDto = z.object({
  categoryId:    nul(id),
  supplierId:    nul(id),
  name:          name(255),
  brand:         nul(str(100)),
  sku:           nul(str(50)),
  barcode:       nul(str(50)),
  description:   nul(z.string()),
  salePrice:     opt(money),
  costPrice:     opt(money),
  commissionPct: opt(money),
  stockMinQty:   opt(money),
  unit:          opt(str(20)),
  imageUrl:      nul(z.string()),
  isActive:      opt(z.boolean()),
  isForSale:     opt(z.boolean()),
  isForService:  opt(z.boolean()),
});
export const productUpdateDto = productCreateDto.partial();

// ─── message templates ──────────────────────────────────────────────────────
export const templateCreateDto = z.object({
  name:      name(100),
  trigger:   name(50),
  channel:   opt(enumOf(notificationChannelEnum)),
  subject:   nul(str(255)),
  message:   z.string().min(1),
  isActive:  opt(z.boolean()),
  sendDelay: opt(int),
});
export const templateUpdateDto = templateCreateDto.partial();

// ─── tenant settings (jsonb) ────────────────────────────────────────────────
// Só o que a tela de configurações grava. Chaves como asaasCustomerId são do
// backend e não podem vir do cliente.
export const tenantSettingsDto = z.object({
  cpfCnpj: z.string().regex(/^(\d{11}|\d{14})$/, "CPF (11) ou CNPJ (14 digitos)"),
}).partial();
