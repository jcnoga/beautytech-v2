// Registro central de funcionalidades por nicho (tenants.business_type).
//
// ESPELHADO: backend/src/config/features.ts e frontend/src/config/features.ts precisam ser
// IDÊNTICOS (o teste backend/tests/nichos.test.ts compara os dois). Altere os dois juntos.
//
// Regras:
// - Toda funcionalidade declara EXPLICITAMENTE os nichos permitidos. Funcionalidade que não
//   estiver aqui, ou com lista vazia, é NEGADA (negação por padrão).
// - business_type vazio/nulo é tratado como "beauty_salon" (nenhum salão antigo perde acesso).
// - business_type desconhecido é negado.
// - Os identificadores são internos e estáveis; o nome exibido fica em BUSINESS_TYPE_LABELS.

export const BUSINESS_TYPES = ["beauty_salon", "barbershop", "aesthetics_clinic", "pilates"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const DEFAULT_BUSINESS_TYPE: BusinessType = "beauty_salon";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  beauty_salon: "Salão de Beleza",
  barbershop: "Barbearia",
  aesthetics_clinic: "Clínica de Estética",
  pilates: "Studio de Pilates",
};

export const FEATURES = {
  // ── Globais: conta da empresa (os 4 nichos) ──────────────────────────────
  account:            ["beauty_salon", "barbershop", "aesthetics_clinic", "pilates"], // login, perfil, /auth/me
  subscription:       ["beauty_salon", "barbershop", "aesthetics_clinic", "pilates"], // planos e assinatura do ZenSalon
  settings:           ["beauty_salon", "barbershop", "aesthetics_clinic", "pilates"], // configurações, equipe, uploads
  help:               ["beauty_salon", "barbershop", "aesthetics_clinic", "pilates"], // ajuda (só frontend)
  audit_logs:         ["beauty_salon", "barbershop", "aesthetics_clinic", "pilates"], // log de ações

  // ── Nichos atuais (salão, barbearia, estética) ───────────────────────────
  dashboard:          ["beauty_salon", "barbershop", "aesthetics_clinic"],
  performance:        ["beauty_salon", "barbershop", "aesthetics_clinic"],
  agenda:             ["beauty_salon", "barbershop", "aesthetics_clinic"],
  clients:            ["beauty_salon", "barbershop", "aesthetics_clinic"],
  professionals:      ["beauty_salon", "barbershop", "aesthetics_clinic"],
  services:           ["beauty_salon", "barbershop", "aesthetics_clinic"],
  packages:           ["beauty_salon", "barbershop", "aesthetics_clinic"],
  financial:          ["beauty_salon", "barbershop", "aesthetics_clinic", "pilates"], // Pilates: lançamentos manuais (mensalidades ainda não geram lançamento)
  commissions:        ["beauty_salon", "barbershop", "aesthetics_clinic"],
  goals:              ["beauty_salon", "barbershop", "aesthetics_clinic"],
  crm:                ["beauty_salon", "barbershop", "aesthetics_clinic"],
  loyalty:            ["beauty_salon", "barbershop", "aesthetics_clinic"],
  marketing:          ["beauty_salon", "barbershop", "aesthetics_clinic"], // campanhas
  whatsapp:           ["beauty_salon", "barbershop", "aesthetics_clinic"], // conexão, envio e resposta automática
  automations:        ["beauty_salon", "barbershop", "aesthetics_clinic"], // automações e modelos de mensagem
  notifications:      ["beauty_salon", "barbershop", "aesthetics_clinic"],
  inventory:          ["beauty_salon", "barbershop", "aesthetics_clinic"], // produtos, estoque, fornecedores
  demo:               ["beauty_salon", "barbershop", "aesthetics_clinic"], // dados de demonstração

  // ── Funções de estética (hoje liberadas nos 3 nichos atuais; decisão futura) ──
  clinical_records:   ["beauty_salon", "barbershop", "aesthetics_clinic"], // prontuário / anamnese
  protocols:          ["beauty_salon", "barbershop", "aesthetics_clinic"], // protocolos e sessões
  appointment_photos: ["beauty_salon", "barbershop", "aesthetics_clinic"], // fotos antes/depois
  consent_forms:      ["beauty_salon", "barbershop", "aesthetics_clinic", "pilates"], // termo LGPD (Pilates: C8)
  treatment_packages: ["beauty_salon", "barbershop", "aesthetics_clinic"], // pacotes de tratamento

  // ── Pilates (exclusivas) ─────────────────────────────────────────────────
  class_students:    ["pilates"], // alunos (clients + dados de Pilates)
  class_instructors: ["pilates"], // instrutores (professionals) e horários de trabalho
  memberships:       ["pilates"], // planos de Pilates e matrículas
  class_settings:    ["pilates"], // configurações do studio (modalidades e regras)
  group_classes:     ["pilates"], // grade, aulas, horários fixos, inscrições, presença, reposições, pausas
  class_leads:       ["pilates"], // interessados (funil; tabela leads do CRM do salão)
} as const satisfies Record<string, readonly BusinessType[]>;

export type Feature = keyof typeof FEATURES;

/**
 * Prefixo da rota da API (sem o /api/v1) → funcionalidade. Vale o prefixo MAIS LONGO que casar.
 * Toda rota que exige login de empresa precisa casar com algum prefixo; senão é negada.
 * Rotas públicas (sem login) e do Super Admin não passam pelo controle de nicho.
 */
export const ROUTE_FEATURES: Record<string, Feature> = {
  "/auth/me": "account",
  "/plan-info": "subscription",
  "/billing": "subscription",
  "/team": "settings",
  "/uploads": "settings",
  "/audit-logs": "audit_logs",

  "/dashboard": "dashboard",
  "/dashboard/performance": "performance",
  "/dashboard/professionals-performance": "performance",
  "/appointments": "agenda",
  "/clients": "clients",
  "/professionals": "professionals",
  "/services": "services",
  "/service-categories": "services",
  "/packages": "packages",
  "/financial": "financial",
  "/commissions": "commissions",
  "/goals": "goals",
  "/leads": "crm",
  "/loyalty": "loyalty",
  "/referrals": "loyalty",
  "/campaigns": "marketing",
  "/whatsapp": "whatsapp",
  "/auto-reply": "whatsapp",
  "/automations": "automations",
  "/automations/notifications": "notifications",
  "/message-templates": "automations",
  "/products": "inventory",
  "/stock-movements": "inventory",
  "/suppliers": "inventory",
  "/demo": "demo",

  "/client-records": "clinical_records",
  "/protocols": "protocols",
  "/protocol-sessions": "protocols",
  "/appointment-photos": "appointment_photos",
  "/consent-forms": "consent_forms",
  "/treatment-packages": "treatment_packages",
  "/package-sessions": "treatment_packages",

  "/class-students": "class_students",
  "/class-leads": "class_leads",
  "/class-instructors": "class_instructors",
  "/memberships/plans": "memberships",
  "/memberships/enrollments": "memberships",
  "/classes/modalities": "class_settings",
  "/classes/settings": "class_settings",
  "/classes/dashboard": "group_classes",
  "/classes/schedules": "group_classes",
  "/classes/sessions": "group_classes",
  "/classes/slots": "group_classes",
  "/classes/bookings": "group_classes",
  "/classes/makeups": "group_classes",
  "/classes/pauses": "group_classes",
};

/** Normaliza o business_type do banco: vazio → padrão; conhecido → ele mesmo; desconhecido → null. */
export function normalizeBusinessType(value: unknown): BusinessType | null {
  if (value === null || value === undefined || value === "") return DEFAULT_BUSINESS_TYPE;
  return (BUSINESS_TYPES as readonly string[]).includes(value as string) ? (value as BusinessType) : null;
}

/** true só se a funcionalidade existe, tem lista de nichos e inclui o nicho (já normalizado). */
export function isFeatureAllowed(feature: string | null | undefined, businessType: BusinessType | null): boolean {
  if (!feature || !businessType) return false;
  const allowed = (FEATURES as Record<string, readonly string[]>)[feature];
  return Array.isArray(allowed) && allowed.length > 0 && allowed.includes(businessType);
}

/** Funcionalidade de um caminho da API (sem o prefixo /api/v1), ou null se nenhum prefixo casar. */
export function featureForPath(path: string): Feature | null {
  let best: string | null = null;
  for (const prefix of Object.keys(ROUTE_FEATURES)) {
    if ((path === prefix || path.startsWith(prefix + "/")) && (!best || prefix.length > best.length)) best = prefix;
  }
  return best ? ROUTE_FEATURES[best] : null;
}
