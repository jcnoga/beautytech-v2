// Painel do studio (service): os números do topo da tela inicial do Pilates.
// - Ativos: alunos com matrícula ativa hoje (situação "active" e período valendo hoje).
// - Aulas hoje: aulas de hoje não canceladas, com alunos (vagas ocupadas) e vagas totais.
// - Mensalidades (só para quem tem acesso ao Financeiro; os outros recebem `money: null`):
//   a receber de hoje até o fim do mês e atrasadas (venceram antes de hoje), das parcelas das matrículas.
// Antes de contar, gera as aulas das próximas 4 semanas (ensureSessions), como a tela "Aulas de hoje":
// a geração é idempotente (restrições únicas + ON CONFLICT DO NOTHING), então chamadas simultâneas não duplicam.
import { hasRole } from "@middleware/auth";
import { ensureSessions } from "./classes.service";
import * as repo from "./dashboard.repository";

export async function studioDashboard(exec: any, tenantId: string, role?: string) {
  await ensureSessions(exec, tenantId);
  const seesMoney = hasRole(role, "financial");
  const [activeStudents, today, date, money] = await Promise.all([
    repo.countActiveStudents(exec, tenantId), repo.todayClasses(exec, tenantId), repo.todayDate(exec),
    seesMoney ? repo.installmentTotals(exec, tenantId) : Promise.resolve(null),
  ]);
  return { date, activeStudents, today, money };
}
