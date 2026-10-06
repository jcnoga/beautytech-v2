// Painel do studio (service): os números do topo da tela inicial do Pilates.
// - Ativos: alunos com matrícula ativa hoje (situação "active" e período valendo hoje).
// - Aulas hoje: aulas de hoje não canceladas, com alunos (vagas ocupadas) e vagas totais.
// Antes de contar, gera as aulas das próximas 4 semanas (ensureSessions), como a tela "Aulas de hoje":
// a geração é idempotente (restrições únicas + ON CONFLICT DO NOTHING), então chamadas simultâneas não duplicam.
// "A receber" e "Atrasados" entram com as mensalidades gerando lançamento no Financeiro (ainda não há fonte confiável).
import { ensureSessions } from "./classes.service";
import * as repo from "./dashboard.repository";

export async function studioDashboard(exec: any, tenantId: string) {
  await ensureSessions(exec, tenantId);
  const [activeStudents, today, date] = await Promise.all([
    repo.countActiveStudents(exec, tenantId), repo.todayClasses(exec, tenantId), repo.todayDate(exec),
  ]);
  return { date, activeStudents, today };
}
