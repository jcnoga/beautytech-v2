// Campos das regras configuráveis (padrão do studio e exceção por plano), só para EXIBIÇÃO:
// rótulo, tipo de campo e agrupamento. Limites e validação ficam no backend (group-classes.dto.ts);
// a tela mostra a mensagem que o backend devolver.

export type RuleField =
  | { key: string; label: string; kind: "bool"; hint?: string }
  | { key: string; label: string; kind: "number"; unit: string; hint?: string; dependsOn?: string }
  | { key: string; label: string; kind: "select"; options: [string, string][]; hint?: string; dependsOn?: string };

export const STUDIO_CANCEL_OPTIONS: [string, string][] = [["refund_credit", "Devolve o crédito"], ["generate_makeup", "Gera reposição"]];

/** Regras que o plano pode sobrescrever (mesmas chaves da API). */
export const PLAN_RULE_SECTIONS: { title: string; fields: RuleField[] }[] = [
  { title: "Cancelamento pelo aluno", fields: [
    { key: "cancelDeadlineEnabled", label: "Exigir prazo mínimo para cancelar", kind: "bool" },
    { key: "cancelMinHours", label: "Prazo mínimo de aviso", kind: "number", unit: "horas antes", dependsOn: "cancelDeadlineEnabled" },
    { key: "lateCancelConsumesCredit", label: "Cancelar fora do prazo desconta a aula", kind: "bool" },
    { key: "timelyCancelGeneratesMakeup", label: "Cancelar no prazo gera reposição", kind: "bool" },
  ] },
  { title: "Faltas", fields: [
    { key: "unexcusedAbsenceConsumesCredit", label: "Falta sem aviso desconta a aula", kind: "bool" },
    { key: "unexcusedAbsenceGeneratesMakeup", label: "Falta sem aviso gera reposição", kind: "bool" },
    { key: "excusedAbsenceConsumesCredit", label: "Falta justificada desconta a aula", kind: "bool" },
    { key: "excusedAbsenceGeneratesMakeup", label: "Falta justificada gera reposição", kind: "bool" },
  ] },
  { title: "Reposição", fields: [
    { key: "makeupEnabled", label: "Permitir reposição", kind: "bool" },
    { key: "makeupValidityDays", label: "Validade da reposição", kind: "number", unit: "dias", dependsOn: "makeupEnabled" },
    { key: "makeupMonthlyLimitEnabled", label: "Limitar reposições por mês", kind: "bool" },
    { key: "makeupMaxPerMonth", label: "Máximo de reposições no mês", kind: "number", unit: "por mês", dependsOn: "makeupMonthlyLimitEnabled" },
  ] },
  { title: "Horário individual", fields: [
    { key: "allowIndividualSlot", label: "Permitir horário individual na matrícula", kind: "bool" },
    { key: "individualSlotCapacity", label: "Alunos no horário individual", kind: "select", options: [["1", "1 aluno"], ["2", "2 alunos (dupla)"]], dependsOn: "allowIndividualSlot" },
  ] },
  { title: "Pausa do plano", fields: [
    { key: "pauseEnabled", label: "Permitir pausa (férias, viagem, lesão)", kind: "bool" },
    { key: "pauseMaxDays", label: "Máximo de dias de pausa por vigência", kind: "number", unit: "dias", dependsOn: "pauseEnabled" },
  ] },
];

/** Regras que só existem no studio (sem exceção por plano). */
export const STUDIO_ONLY_SECTIONS: { title: string; fields: RuleField[] }[] = [
  { title: "Padrões das aulas", fields: [
    { key: "defaultClassDuration", label: "Duração padrão da aula", kind: "number", unit: "minutos" },
    { key: "defaultClassCapacity", label: "Capacidade padrão da turma", kind: "number", unit: "alunos" },
  ] },
  { title: "Aula cancelada pelo studio (feriado, studio fechado)", fields: [
    { key: "studioCancelActionPackage", label: "Aluno de pacote", kind: "select", options: STUDIO_CANCEL_OPTIONS },
    { key: "studioCancelActionFrequency", label: "Aluno de plano por frequência", kind: "select", options: STUDIO_CANCEL_OPTIONS },
  ] },
  { title: "Presença lançada pelo instrutor", fields: [
    { key: "instructorAttendanceScope", label: "Instrutor lança presença em", kind: "select", options: [["own", "Só nas aulas dele"], ["all", "Todas as aulas"]] },
    { key: "instructorEditWindowHours", label: "Prazo para o instrutor lançar ou corrigir", kind: "number", unit: "horas depois da aula" },
  ] },
];

/** No plano, cancelamento pelo studio é uma regra só (o studio separa por tipo de plano). */
export const PLAN_STUDIO_CANCEL: RuleField = { key: "studioCancelAction", label: "Aula cancelada pelo studio", kind: "select", options: STUDIO_CANCEL_OPTIONS };

const ALL_FIELDS = [...PLAN_RULE_SECTIONS, ...STUDIO_ONLY_SECTIONS].flatMap((s) => s.fields).concat(PLAN_STUDIO_CANCEL);

/** Troca o nome técnico do campo pelo rótulo na mensagem de validação do backend. */
export function humanizeRuleError(msg: string) {
  let out = msg;
  for (const f of ALL_FIELDS) out = out.split(`${f.key}:`).join(`${f.label}:`);
  return out.replace("Dados invalidos", "Dados inválidos")
    .replace(/Number must be less than or equal to (\d+)/g, "o máximo é $1")
    .replace(/Number must be greater than or equal to (\d+)/g, "o mínimo é $1")
    .replace(/Expected number, received \w+/g, "informe um número");
}
