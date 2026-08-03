path = "backend/src/modules/salon-profile/salon-profile.routes.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1. Adicionar import do "sql" (necessario pra query raw)
old_import = 'import { eq, and, isNull, gte, lte } from "drizzle-orm";'
new_import = 'import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";'
if old_import in content:
    content = content.replace(old_import, new_import)
    changes += 1
    print("OK (1/2): import do sql adicionado")
else:
    print("AVISO (1/2): linha de import nao encontrada")

# 2. Adicionar a rota nova antes do fechamento da funcao (ultima linha "}")
old_tail = """    return reply.send({ success: true, data, total: data.length });
  });
}"""
new_tail = """    return reply.send({ success: true, data, total: data.length });
  });

  // ------------------------------------------------------------
  // GET /public/my-appointments?whatsapp=...
  // Lista agendamentos de um cliente em qualquer tenant, pelo WhatsApp
  // ------------------------------------------------------------
  fastify.get("/public/my-appointments", async (req: any, reply) => {
    const raw = (req.query?.whatsapp || "").toString();
    const digits = raw.replace(/\\D/g, "");
    if (!digits || digits.length < 8) {
      return reply.status(400).send({ success: false, error: "Informe um WhatsApp valido" });
    }
    const result: any = await db.execute(sql`
      SELECT
        a.id,
        a.scheduled_at   AS "scheduledAt",
        a.status         AS "status",
        t.name            AS "tenantName",
        t.slug            AS "tenantSlug",
        p.full_name       AS "professionalName",
        string_agg(s.name, ', ') AS "serviceNames"
      FROM appointments a
      JOIN clients c        ON c.id = a.client_id
      JOIN tenants t        ON t.id = a.tenant_id
      LEFT JOIN professionals p        ON p.id = a.professional_id
      LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
      LEFT JOIN services s             ON s.id = aps.service_id
      WHERE regexp_replace(c.whatsapp, '\\D', '', 'g') = ${digits}
      GROUP BY a.id, a.scheduled_at, a.status, t.name, t.slug, p.full_name
      ORDER BY a.scheduled_at DESC
      LIMIT 100
    `);
    const rows = Array.isArray(result) ? result : (result.rows ?? []);
    return reply.send({ success: true, data: rows });
  });
}"""
if old_tail in content:
    content = content.replace(old_tail, new_tail)
    changes += 1
    print("OK (2/2): rota /public/my-appointments adicionada")
else:
    print("AVISO (2/2): final do arquivo nao encontrado - verifique se o trecho de promotions bate exatamente")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/2")
