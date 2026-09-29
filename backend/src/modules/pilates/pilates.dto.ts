// DTOs das rotas /pilates/*. Só entram campos editáveis pelo usuário (lista explícita);
// campos desconhecidos são descartados (zod strip). tenantId e ids nunca vêm do corpo.
import { z } from "zod";

const blank = (v: unknown) => v === "" || v === undefined;
/** Coluna NOT NULL com default: "" / null viram "não informado". */
const opt = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (blank(v) || v === null ? undefined : v), s.optional());
/** Coluna nullable: "" vira null. */
const nul = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === "" ? null : v), s.nullable().optional());

const str = (max: number) => z.string().trim().max(max);
const name = (max: number) => z.string().trim().min(1).max(max);
const id = z.string().uuid();
const int = z.coerce.number().int();
const money = z.coerce.number().finite().min(0).max(1_000_000).transform((n) => n.toFixed(2));
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "use HH:MM");

export const STUDENT_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const STUDENT_STATUSES = ["active", "paused", "inactive", "cancelled"] as const;
export const PLAN_KINDS = ["frequency", "package"] as const;
export const ENROLLMENT_STATUSES = ["active", "paused", "ended", "cancelled"] as const;

// ─── alunos (clients + pilates_student_profiles) ────────────────────────────
export const studentCreateDto = z.object({
  // dados do cadastro (clients)
  fullName:              name(255),
  phone:                 nul(str(20)),
  whatsapp:              nul(str(20)),
  email:                 nul(z.string().trim().email().max(255)),
  birthDate:             nul(day),
  // dados de Pilates (pilates_student_profiles)
  goal:                  nul(str(1000)),
  level:                 opt(z.enum(STUDENT_LEVELS)),
  startDate:             nul(day),
  weeklyFrequency:       nul(int.min(1).max(7)),
  status:                opt(z.enum(STUDENT_STATUSES)),
  instructorId:          nul(id),
  notes:                 nul(str(5000)),
  emergencyContactName:  nul(str(255)),
  emergencyContactPhone: nul(str(20)),
  initialAssessmentDate: nul(day),
  declaredRestrictions:  nul(str(2000)),
});
export const studentUpdateDto = studentCreateDto.partial();
export const STUDENT_CLIENT_FIELDS = ["fullName", "phone", "whatsapp", "email", "birthDate"] as const;

// ─── instrutores (professionals) ────────────────────────────────────────────
export const instructorCreateDto = z.object({
  fullName:                 name(255),
  phone:                    nul(str(20)),
  whatsapp:                 nul(str(20)),
  email:                    nul(z.string().trim().email().max(255)),
  bio:                      nul(str(2000)),
  specialties:              opt(z.array(str(100)).max(20)),
  professionalRegistration: nul(str(40)),
  commissionPct:            opt(z.coerce.number().finite().min(0).max(100).transform((n) => n.toFixed(2))),
  isActive:                 opt(z.boolean()),
});
export const instructorUpdateDto = instructorCreateDto.partial();

export const instructorSchedulesDto = z.array(z.object({
  dayOfWeek:  int.min(0).max(6),
  isWorking:  z.boolean(),
  startTime:  hhmm,
  endTime:    hhmm,
  breakStart: nul(hhmm),
  breakEnd:   nul(hhmm),
})).max(7)
  .refine((rows) => new Set(rows.map((r) => r.dayOfWeek)).size === rows.length, "dia da semana repetido")
  .refine((rows) => rows.every((r) => !r.isWorking || r.startTime < r.endTime), "início deve ser antes do fim");

// ─── planos (pilates_plans) ─────────────────────────────────────────────────
export const planCreateDto = z.object({
  name:           name(255),
  description:    nul(str(2000)),
  kind:           z.enum(PLAN_KINDS),
  price:          opt(money),
  classesPerWeek: nul(int.min(1).max(7)),
  durationMonths: nul(int.min(1).max(12)),
  totalClasses:   nul(int.min(1).max(1000)),
  validityDays:   nul(int.min(1).max(3650)),
  modalityId:     nul(id),
  isTrial:        opt(z.boolean()),
  status:         opt(z.enum(["active", "inactive"] as const)),
});
export const planUpdateDto = planCreateDto.partial();

/** Regras do tipo de plano (C1), conferidas sobre o registro final (criação ou edição). */
export function planRuleError(p: { kind?: string | null; classesPerWeek?: number | null; durationMonths?: number | null;
  totalClasses?: number | null; validityDays?: number | null; isTrial?: boolean | null }): string | null {
  if (p.kind === "frequency") {
    if (!p.classesPerWeek) return "Plano por frequência precisa de aulas por semana";
    if (!p.durationMonths) return "Plano por frequência precisa da vigência em meses";
    if (p.isTrial) return "Aula experimental é um pacote, não um plano por frequência";
  }
  if (p.kind === "package") {
    if (!p.totalClasses) return "Pacote precisa da quantidade de aulas";
    if (!p.validityDays) return "Pacote precisa da validade em dias";
  }
  return null;
}

// ─── matrículas (pilates_enrollments) ───────────────────────────────────────
export const enrollmentCreateDto = z.object({
  studentId: id,
  planId:    id,
  startDate: day,
  endDate:   nul(day),
  dueDay:    nul(int.min(1).max(28)),
  price:     opt(money),
  notes:     nul(str(2000)),
});
export const enrollmentUpdateDto = z.object({
  status:  opt(z.enum(ENROLLMENT_STATUSES)),
  endDate: nul(day),
  dueDay:  nul(int.min(1).max(28)),
  notes:   nul(str(2000)),
});

// ─── modalidades (services) ─────────────────────────────────────────────────
export const modalityCreateDto = z.object({
  name:            name(255),
  description:     nul(str(2000)),
  durationMinutes: opt(int.min(5).max(600)),
  price:           opt(money),
  isActive:        opt(z.boolean()),
});
export const modalityUpdateDto = modalityCreateDto.partial();
