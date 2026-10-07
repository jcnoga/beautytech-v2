// Dados de teste (Super Admin): quantidades de cada lote, num lugar só. Pequenas de propósito.
// Salão vale também para barbearia e clínica (por enquanto sem protocolos/prontuário).
export const TEST_DATA_SIZES = {
  salon: {
    professionals: 2,
    services: 3,
    clients: 5,
    appointments: 8, // metade nos últimos 7 dias, metade nos próximos 7
    transactions: 4, // receitas avulsas (2 pagas, 2 pendentes)
  },
  pilates: {
    instructors: 2,
    plans: 2,        // mensal 2x por semana + pacote de 8 aulas
    students: 6,
    enrollments: 5,  // geram as mensalidades no Financeiro
    schedules: 3,    // horários na grade (geram as aulas das próximas semanas)
    leads: 3,        // interessados (1 em aula experimental)
  },
} as const;

/** Prefixo do nome de tudo que o gerador cria (só para quem olha a tela: o "Apagar" usa os ids do lote). */
export const TEST_PREFIX = "[TESTE]";
