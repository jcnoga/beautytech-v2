#!/usr/bin/env bash
set -e

FILE="src/modules/all-modules.ts"

if [ ! -f "$FILE" ]; then
  echo "ERRO: rode este script de dentro de /c/projetos/beautytech-v2/backend"
  exit 1
fi

if grep -q "custom-domain" "$FILE"; then
  echo "Já existe código de custom-domain no arquivo — nada a fazer."
  exit 0
fi

cp "$FILE" "$FILE.bak1"
echo "Backup salvo em $FILE.bak1"

MARKER='// PLAN SETTINGS - GET ALL'

cat > /tmp/custom-domain-block.txt << 'BLOCKEOF'
// ============================================================
// COLE ISSO logo depois da rota /super-admin/tenants/:id/whatsapp-mode
// em all-modules.ts (mesmo bloco de rotas do Super Admin)
// ============================================================

fastify.patch(
  "/super-admin/tenants/:id/custom-domain",
  { preHandler: [requireSuperAdmin] },
  async (req: any, reply) => {
    const { id } = req.params as { id: string };
    const { domain } = req.body as { domain: string };

    if (!domain) {
      return reply.status(400).send({ success: false, error: "Domínio é obrigatório." });
    }

    const vercelToken = process.env.VERCEL_API_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID; // ex: prj_xxxxx (achar em vercel.com -> projeto -> Settings -> General)
    const vercelTeamId = process.env.VERCEL_TEAM_ID; // opcional, só se o projeto for de um time

    if (!vercelToken || !vercelProjectId) {
      return reply.status(500).send({
        success: false,
        error: "VERCEL_API_TOKEN ou VERCEL_PROJECT_ID não configurados no backend.",
      });
    }

    try {
      // 1) Adiciona o domínio no projeto Vercel via API
      const vercelUrl = `https://api.vercel.com/v10/projects/${vercelProjectId}/domains${
        vercelTeamId ? `?teamId=${vercelTeamId}` : ""
      }`;

      const vercelRes = await fetch(vercelUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      });

      const vercelData = (await vercelRes.json()) as any;

      // Se o domínio já estiver cadastrado no projeto, a Vercel retorna erro
      // "domain_already_in_use" — tratamos como não-fatal, seguimos o fluxo
      // (pode ser um retry do próprio admin).
      const alreadyExists = vercelData?.error?.code === "domain_already_in_use";

      if (!vercelRes.ok && !alreadyExists) {
        return reply.status(400).send({
          success: false,
          error: vercelData?.error?.message ?? "Erro ao adicionar domínio na Vercel.",
        });
      }

      // 2) Consulta a configuração de DNS que a Vercel espera para esse domínio
      //    (ela decide sozinha se é CNAME ou A record, dependendo se é
      //    subdomínio "www.x.com" ou domínio raiz "x.com").
      const configUrl = `https://api.vercel.com/v6/domains/${domain}/config${
        vercelTeamId ? `?teamId=${vercelTeamId}` : ""
      }`;
      const configRes = await fetch(configUrl, {
        headers: { Authorization: `Bearer ${vercelToken}` },
      });
      const configData = (await configRes.json()) as any;

      // 3) Grava o domínio no tenant (mesmo se a verificação de DNS ainda
      //    estiver pendente do lado do cliente — o campo customDomain
      //    precisa existir para o tenant-resolver.ts já reconhecer o
      //    domínio assim que o DNS propagar).
      await db.update(tenants).set({ customDomain: domain }).where(eq(tenants.id, id));

      return reply.send({
        success: true,
        data: {
          domain,
          verified: vercelData?.verified ?? false,
          dnsInstructions: {
            // Se for subdomínio (ex: www.cliente.com.br) -> CNAME
            // Se for domínio raiz (ex: cliente.com.br) -> A record
            type: configData?.misconfigured ? (domain.startsWith("www.") ? "CNAME" : "A") : "OK",
            cnameTarget: "cname.vercel-dns.com",
            aRecordIp: "76.76.21.21",
            misconfigured: configData?.misconfigured ?? true,
          },
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  }
);

// Rota auxiliar: consultar status de verificação do domínio (pra polling
// no frontend, tipo "ainda propagando" -> "verificado").
fastify.get(
  "/super-admin/tenants/:id/custom-domain/status",
  { preHandler: [requireSuperAdmin] },
  async (req: any, reply) => {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    const [tenant] = await db
      .select({ customDomain: tenants.customDomain })
      .from(tenants)
      .where(eq(tenants.id, (req.params as any).id));

    if (!tenant?.customDomain) {
      return reply.send({ success: true, data: { hasDomain: false } });
    }

    try {
      const configUrl = `https://api.vercel.com/v6/domains/${tenant.customDomain}/config${
        vercelTeamId ? `?teamId=${vercelTeamId}` : ""
      }`;
      const configRes = await fetch(configUrl, {
        headers: { Authorization: `Bearer ${vercelToken}` },
      });
      const configData = (await configRes.json()) as any;

      return reply.send({
        success: true,
        data: {
          hasDomain: true,
          domain: tenant.customDomain,
          verified: !configData?.misconfigured,
        },
      });
    } catch (err: any) {
      return reply.send({ success: true, data: { hasDomain: true, domain: tenant.customDomain, verified: false } });
    }
  }
);
BLOCKEOF

awk -v marker="$MARKER" '
  BEGIN { while ((getline line < "/tmp/custom-domain-block.txt") > 0) block = block line "
" }
  $0 ~ marker && !done { print block; done=1 }
  { print }
  ' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

echo "Código inserido. Conferindo..."
grep -n "custom-domain" "$FILE"
