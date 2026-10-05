// Etapas do funil de interessados do Pilates — ÚNICA lista. O service valida contra ela e a tela monta as
// colunas a partir de GET /class-leads/stages. Nova etapa (ex.: contatado, proposta) = nova linha aqui, na
// posição do funil; leads.status é texto (migration 0006), então não precisa de migração nem de mudar a tela.
// Chaves já usadas pelo salão mantêm o mesmo sentido (interested, converted, lost).
export type LeadStage = {
  key: string;
  label: string;
  /** Etapa de saída do funil (não gera alerta de próximo contato). */
  final?: boolean;
  /** Só a conversão em aluno leva a esta etapa (PATCH recusa). */
  onlyByConversion?: boolean;
  /** Fora da lista padrão; aparece só quando pedida (?status=). */
  hidden?: boolean;
};

export const PILATES_LEAD_STAGES = [
  { key: "interested", label: "Interessado" },
  { key: "trial", label: "Experimental" },
  { key: "converted", label: "Matriculado", final: true, onlyByConversion: true },
  { key: "lost", label: "Perdido", final: true, hidden: true },
] as const satisfies readonly LeadStage[];

export const LEAD_STAGE_KEYS: readonly string[] = PILATES_LEAD_STAGES.map((s) => s.key);
export const INITIAL_LEAD_STAGE = PILATES_LEAD_STAGES[0].key;
export const CONVERTED_LEAD_STAGE = "converted";
export const findLeadStage = (key: string): LeadStage | undefined => PILATES_LEAD_STAGES.find((s) => s.key === key);
