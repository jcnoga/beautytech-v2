// DTOs das rotas de Aulas em turma (/class-students, /class-instructors, /memberships/*, /classes/*). Só entram campos editáveis pelo usuário (lista explícita);
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

// ─── alunos (clients + student_profiles) ────────────────────────────
export const studentCreateDto = z.object({
  // dados do cadastro (clients)
  fullName:              name(255),
  phone:                 nul(str(20)),
  whatsapp:              nul(str(20)),
  email:                 nul(z.string().trim().email().max(255)),
  birthDate:             nul(day),
  // ficha do aluno (student_profiles)
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
  avatarUrl:                nul(str(1000)), // URL devolvida por POST /uploads?kind=professional
  specialties:              opt(z.array(str(100)).max(20)),
  professionalRegistration: nul(str(40)),
  commissionPct:            opt(z.coerce.number().finite().min(0).max(100).transform((n) => n.toFixed(2))),
  isActive:                 opt(z.boolean()),
});
export const instructorUpdateDto = instructorCreateDto.partial().extend({
  userProfileId: nul(id), // login do instrutor (usuário da equipe); null = sem login
});

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

// ─── regras (Fase 3): padrão do studio e exceção por plano ──────────────────
const boolRule = () => z.boolean();
const RULE_SCHEMAS = {
  allowIndividualSlot:             boolRule(),
  individualSlotCapacity:          int.refine((n) => n === 1 || n === 2, "use 1 ou 2"),
  cancelDeadlineEnabled:           boolRule(),
  cancelMinHours:                  int.min(0).max(168),
  makeupEnabled:                   boolRule(),
  makeupValidityDays:              int.min(1).max(365),
  makeupMonthlyLimitEnabled:       boolRule(),
  makeupMaxPerMonth:               int.min(0).max(31),
  unexcusedAbsenceConsumesCredit:  boolRule(),
  unexcusedAbsenceGeneratesMakeup: boolRule(),
  excusedAbsenceGeneratesMakeup:   boolRule(),
  excusedAbsenceConsumesCredit:    boolRule(),
  timelyCancelGeneratesMakeup:     boolRule(),
  lateCancelConsumesCredit:        boolRule(),
  pauseEnabled:                    boolRule(),
  pauseMaxDays:                    int.min(1).max(365),
};
const STUDIO_CANCEL = z.enum(["refund_credit", "generate_makeup"] as const);
/** No plano: cada regra aceita null (= usar o padrão do studio). */
function planRuleOverrides() {
  const o: Record<string, z.ZodTypeAny> = {};
  for (const [k, v] of Object.entries(RULE_SCHEMAS)) o[k] = z.preprocess((x) => (x === "" ? null : x), (v as z.ZodTypeAny).nullable().optional());
  o.studioCancelAction = z.preprocess((x) => (x === "" ? null : x), STUDIO_CANCEL.nullable().optional());
  return o as { [K in keyof typeof RULE_SCHEMAS | "studioCancelAction"]: z.ZodTypeAny };
}
export const PLAN_OVERRIDE_KEYS = [...Object.keys(RULE_SCHEMAS), "studioCancelAction"];

/** Padrões do studio: tudo opcional na edição, nunca null. */
export const studioSettingsDto = z.object({
  ...Object.fromEntries(Object.entries(RULE_SCHEMAS).map(([k, v]) => [k, opt(v as z.ZodTypeAny)])),
  studioCancelActionPackage:   opt(STUDIO_CANCEL),
  studioCancelActionFrequency: opt(STUDIO_CANCEL),
  instructorAttendanceScope:   opt(z.enum(["own", "all"] as const)),
  instructorEditWindowHours:   opt(int.min(0).max(720)),
  defaultClassDuration:        opt(int.min(10).max(300)),
  defaultClassCapacity:        opt(int.min(1).max(50)),
});

// ─── planos (membership_plans) ─────────────────────────────────────────────────
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
  ...planRuleOverrides(),
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

// ─── matrículas (membership_enrollments) ───────────────────────────────────────
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

// ─── Fase 3: grade, aulas, horários fixos, inscrições, presença, pausas ─────
export const CLASS_TYPES = ["individual", "duo", "group"] as const;

export const scheduleCreateDto = z.object({
  instructorId:    id,
  modalityId:      nul(id),
  dayOfWeek:       int.min(0).max(6),
  startTime:       hhmm,
  durationMinutes: opt(int.min(10).max(300)),
  room:            nul(str(100)),
  capacity:        opt(int.min(1).max(50)),
  classType:       opt(z.enum(CLASS_TYPES)),
});
export const scheduleUpdateDto = scheduleCreateDto.partial().extend({ isActive: opt(z.boolean()) });

/** Aula avulsa (sem grade), ex.: avaliação inicial ou aula extra fora da grade. */
export const sessionCreateDto = z.object({
  date:            day,
  startTime:       hhmm,
  durationMinutes: opt(int.min(10).max(300)),
  instructorId:    id,
  modalityId:      nul(id),
  room:            nul(str(100)),
  capacity:        opt(int.min(1).max(50)),
  classType:       opt(z.enum([...CLASS_TYPES, "assessment"] as const)),
  notes:           nul(str(1000)),
});
/** Nesta aula (uma ocorrência): trocar instrutor, sala ou observação. */
export const sessionUpdateDto = z.object({
  instructorId: opt(id),
  room:         nul(str(100)),
  notes:        nul(str(1000)),
});
export const sessionCancelDto = z.object({ reason: nul(str(255)) });

export const slotCreateDto = z.object({
  enrollmentId: id,
  scheduleId:   opt(id),
  individual:   opt(z.object({
    dayOfWeek:       int.min(0).max(6),
    startTime:       hhmm,
    instructorId:    id,
    modalityId:      nul(id),
    durationMinutes: opt(int.min(10).max(300)),
    room:            nul(str(100)),
  })),
}).refine((b) => !!b.scheduleId !== !!b.individual, "informe a turma (scheduleId) OU o horário individual");

export const bookingCreateDto = z.object({
  sessionId:      id,
  studentId:      id,
  enrollmentId:   opt(id),   // pacote / experimental: de qual matrícula sai o crédito
  makeupCreditId: opt(id),   // reposição: qual crédito de reposição usar
}).refine((b) => !!b.enrollmentId !== !!b.makeupCreditId, "informe a matrícula (pacote) OU a reposição");

export const extraClassDto = z.object({ studentId: id, planId: id, sessionId: id });
export const attendanceDto = z.object({ status: z.enum(["present", "absent", "excused"] as const) });

export const pauseCreateDto = z.object({
  enrollmentId: id,
  startDate:    day,
  endDate:      day,
  reason:       nul(str(200)),
});

// ─── interessados (leads do Pilates) ────────────────────────────────────────
// A etapa (status) é conferida no service contra lead-stages.ts; aqui só o formato.
// Fora: convertedTo e convertedAt (definidos pela conversão em aluno).
export const classLeadCreateDto = z.object({
  name:       name(255),
  whatsapp:   nul(str(20)),
  source:     nul(str(50)),
  status:     opt(str(30)),
  followUpAt: nul(day), // próximo contato (dia de calendário em Brasília)
  notes:      nul(str(5000)),
});
export const classLeadUpdateDto = classLeadCreateDto.partial();
export const classLeadConvertDto = z.object({
  confirmDuplicate: opt(z.boolean()), // true = criar o aluno mesmo com o WhatsApp já usado por outro cliente
});
