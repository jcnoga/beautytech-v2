content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

old = "export async function clientsModule(fastify: FastifyInstance) {"

new = """// PLAN ENFORCEMENT HELPER
async function getPlanInfo(tenantId: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  const settings = await db.execute(sql`SELECT key, value FROM plan_settings`);
  const rows = (settings as any).rows ?? (Array.isArray(settings) ? settings : []);
  const cfg: any = {};
  rows.forEach((r: any) => { cfg[r.key] = r.value; });
  const now = new Date();
  const trialEndsAt = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
  const isTrialActive = tenant.planTier === "trial" && trialEndsAt && trialEndsAt > now;
  const effectivePlan = isTrialActive ? "trial" : (tenant.planTier === "trial" ? "basic" : tenant.planTier);
  return {
    effectivePlan,
    isFree: effectivePlan === "basic",
    maxClients: effectivePlan === "basic" ? Number(cfg.free_max_clients ?? 30) : 99999,
    maxAppointmentsMonth: effectivePlan === "basic" ? Number(cfg.free_max_appointments_month ?? 50) : 99999,
    features: {
      whatsapp: effectivePlan !== "basic",
      automations: effectivePlan !== "basic",
      campaigns: effectivePlan !== "basic",
    }
  };
}

export async function clientsModule(fastify: FastifyInstance) {"""

if old in content:
    open('/'.join(['C:', 'projetos', 'beautytech-v2', 'backend', 'src', 'modules', 'all-modules.ts']), 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO - tentando busca parcial')
    idx = content.find('clientsModule(fastify: FastifyInstance)')
    print(f'Posicao encontrada: {idx}')
    print(repr(content[max(0,idx-50):idx+50]))
