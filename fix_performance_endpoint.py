path = "backend/src/modules/all-modules.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

old_tail = """    .where(and(eq(professionals.tenantId, tenantId), eq(professionals.isActive, true)))
    .groupBy(professionals.id)
    .orderBy(sql`coalesce(sum(${appointments.totalPrice}), 0) desc`);
    return reply.send({ success: true, data });
  });
}"""

new_tail = """    .where(and(eq(professionals.tenantId, tenantId), eq(professionals.isActive, true)))
    .groupBy(professionals.id)
    .orderBy(sql`coalesce(sum(${appointments.totalPrice}), 0) desc`);
    return reply.send({ success: true, data });
  });

  // ------------------------------------------------------------
  // GET /dashboard/performance?period=today|week|month|year
  // KPIs de desempenho: faturamento, ticket medio, receita por servico,
  // faturamento por profissional, agendamentos, comparecimento,
  // cancelamento, no-show e ocupacao de agenda.
  // ------------------------------------------------------------
  fastify.get("/dashboard/performance", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const period = ((req.query?.period as string) || "month").toLowerCase();

    const now = new Date();
    const startDay = new Date(now); startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(now); endDay.setHours(23, 59, 59, 999);
    const dow = now.getDay();
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    const startWeek = new Date(now); startWeek.setDate(now.getDate() - diffToMonday); startWeek.setHours(0, 0, 0, 0);
    const endWeek = new Date(startWeek); endWeek.setDate(startWeek.getDate() + 6); endWeek.setHours(23, 59, 59, 999);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startYear = new Date(now.getFullYear(), 0, 1);
    const endYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    let start: Date, end: Date;
    if (period === "today") { start = startDay; end = endDay; }
    else if (period === "week") { start = startWeek; end = endWeek; }
    else if (period === "year") { start = startYear; end = endYear; }
    else { start = startMonth; end = endMonth; }

    const toISODate = (d: Date) => d.toISOString().split("T")[0];
    const unwrap = (r: any) => Array.isArray(r) ? r : (r?.rows ?? []);

    const [
      revTodayRows, revWeekRows, revMonthRows, revYearRows,
      ticketRows, receitaServicoRows, faturamentoProfRows,
      agendStatsRows, ocupacaoDisponivelRows, minutosUsadosRows,
    ] = await Promise.all([
      db.execute(sql`SELECT coalesce(sum(amount),0) as total FROM financial_transactions WHERE tenant_id=${tenantId} AND type='revenue' AND status='confirmed' AND due_date >= ${toISODate(startDay)} AND due_date <= ${toISODate(endDay)}`),
      db.execute(sql`SELECT coalesce(sum(amount),0) as total FROM financial_transactions WHERE tenant_id=${tenantId} AND type='revenue' AND status='confirmed' AND due_date >= ${toISODate(startWeek)} AND due_date <= ${toISODate(endWeek)}`),
      db.execute(sql`SELECT coalesce(sum(amount),0) as total FROM financial_transactions WHERE tenant_id=${tenantId} AND type='revenue' AND status='confirmed' AND due_date >= ${toISODate(startMonth)} AND due_date <= ${toISODate(endMonth)}`),
      db.execute(sql`SELECT coalesce(sum(amount),0) as total FROM financial_transactions WHERE tenant_id=${tenantId} AND type='revenue' AND status='confirmed' AND due_date >= ${toISODate(startYear)} AND due_date <= ${toISODate(endYear)}`),

      db.execute(sql`
        SELECT coalesce(sum(a.total_price),0) as revenue, count(DISTINCT a.client_id) as clientes
        FROM appointments a
        WHERE a.tenant_id=${tenantId} AND a.status='completed'
          AND a.scheduled_at >= ${start.toISOString()} AND a.scheduled_at <= ${end.toISOString()}
      `),

      db.execute(sql`
        SELECT s.name as servico, coalesce(sum(aps.total),0) as receita
        FROM appointment_services aps
        JOIN appointments a ON a.id = aps.appointment_id
        JOIN services s ON s.id = aps.service_id
        WHERE aps.tenant_id=${tenantId} AND a.status='completed'
          AND a.scheduled_at >= ${start.toISOString()} AND a.scheduled_at <= ${end.toISOString()}
        GROUP BY s.name
        ORDER BY receita DESC
        LIMIT 10
      `),

      db.execute(sql`
        SELECT p.id::text as id, p.full_name as nome, coalesce(sum(a.total_price),0) as receita, count(a.id) as atendimentos
        FROM professionals p
        LEFT JOIN appointments a ON a.professional_id = p.id AND a.status='completed'
          AND a.scheduled_at >= ${start.toISOString()} AND a.scheduled_at <= ${end.toISOString()}
        WHERE p.tenant_id=${tenantId} AND p.is_active = true
        GROUP BY p.id, p.full_name
        ORDER BY receita DESC
      `),

      db.execute(sql`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE status='completed') as compareceram,
          count(*) FILTER (WHERE status='cancelled') as cancelados,
          count(*) FILTER (WHERE status='no_show') as no_show
        FROM appointments
        WHERE tenant_id=${tenantId}
          AND scheduled_at >= ${start.toISOString()} AND scheduled_at <= ${end.toISOString()}
          AND deleted_at IS NULL
      `),

      db.execute(sql`
        SELECT coalesce(sum(
          EXTRACT(EPOCH FROM (ps.end_time - ps.start_time)) / 60
          - CASE WHEN ps.break_start IS NOT NULL AND ps.break_end IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (ps.break_end - ps.break_start)) / 60
                 ELSE 0 END
        ) * dias.qtd, 0) as minutos_disponiveis
        FROM professional_schedules ps
        JOIN professionals p ON p.id = ps.professional_id AND p.is_active = true
        JOIN (
          SELECT extract(dow from d)::int as dow, count(*) as qtd
          FROM generate_series(${toISODate(start)}::date, ${toISODate(end)}::date, interval '1 day') d
          GROUP BY extract(dow from d)
        ) dias ON dias.dow = ps.day_of_week
        WHERE ps.tenant_id=${tenantId} AND ps.is_working = true
      `),

      db.execute(sql`
        SELECT coalesce(sum(duration_minutes),0) as minutos
        FROM appointments
        WHERE tenant_id=${tenantId}
          AND scheduled_at >= ${start.toISOString()} AND scheduled_at <= ${end.toISOString()}
          AND status <> 'cancelled'
          AND deleted_at IS NULL
      `),
    ]);

    const revenueToday = Number(unwrap(revTodayRows)[0]?.total ?? 0);
    const revenueWeek = Number(unwrap(revWeekRows)[0]?.total ?? 0);
    const revenueMonth = Number(unwrap(revMonthRows)[0]?.total ?? 0);
    const revenueYear = Number(unwrap(revYearRows)[0]?.total ?? 0);

    const ticketRow = unwrap(ticketRows)[0] || {};
    const ticketRevenue = Number(ticketRow.revenue ?? 0);
    const ticketClientes = Number(ticketRow.clientes ?? 0);
    const ticketMedio = ticketClientes > 0 ? ticketRevenue / ticketClientes : 0;

    const receitaPorServico = unwrap(receitaServicoRows).map((r: any) => ({
      servico: r.servico, receita: Number(r.receita),
    }));

    const faturamentoPorProfissional = unwrap(faturamentoProfRows).map((r: any) => ({
      id: r.id, nome: r.nome, receita: Number(r.receita), atendimentos: Number(r.atendimentos),
    }));

    const agend = unwrap(agendStatsRows)[0] || {};
    const totalAgendamentos = Number(agend.total ?? 0);
    const compareceram = Number(agend.compareceram ?? 0);
    const cancelados = Number(agend.cancelados ?? 0);
    const noShow = Number(agend.no_show ?? 0);
    const taxaComparecimento = totalAgendamentos > 0 ? (compareceram / totalAgendamentos) * 100 : 0;
    const taxaCancelamento = totalAgendamentos > 0 ? (cancelados / totalAgendamentos) * 100 : 0;
    const taxaNoShow = totalAgendamentos > 0 ? (noShow / totalAgendamentos) * 100 : 0;

    const minutosDisponiveis = Number(unwrap(ocupacaoDisponivelRows)[0]?.minutos_disponiveis ?? 0);
    const minutosUsados = Number(unwrap(minutosUsadosRows)[0]?.minutos ?? 0);
    const ocupacaoAgenda = minutosDisponiveis > 0 ? Math.min((minutosUsados / minutosDisponiveis) * 100, 100) : 0;

    return reply.send({
      success: true,
      data: {
        period,
        revenueToday, revenueWeek, revenueMonth, revenueYear,
        ticketMedio,
        receitaPorServico,
        faturamentoPorProfissional,
        totalAgendamentos, compareceram, cancelados, noShow,
        taxaComparecimento, taxaCancelamento, taxaNoShow,
        minutosDisponiveis, minutosUsados, ocupacaoAgenda,
        generatedAt: new Date().toISOString(),
      },
    });
  });
}"""

if old_tail in content:
    content = content.replace(old_tail, new_tail)
    changes += 1
    print("OK: endpoint /dashboard/performance adicionado")
else:
    print("AVISO: bloco de referencia nao encontrado - nenhuma alteracao feita")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/1")
