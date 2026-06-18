# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adiciona estado saTab no SuperAdminDashboard
old_state = "  const [stats, setStats]     = useState<any>(null);\n  const [tenants, setTenants] = useState<any[]>([]);"
new_state = "  const [saTab, setSaTab]     = useState<'tenants'|'logs'>('tenants');\n  const [saLogs, setSaLogs]   = useState<any[]>([]);\n  const [logsLoading, setLogsLoading] = useState(false);\n  const [stats, setStats]     = useState<any>(null);\n  const [tenants, setTenants] = useState<any[]>([]);"
content = content.replace(old_state, new_state)

# 2. Adiciona funcao para buscar logs no Super Admin
old_load = "  const load = async () => {"
new_load = """  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await saFetch("GET", "/super-admin/audit-logs?limit=100");
      setSaLogs(res.data ?? []);
    } catch(e) { console.error(e); }
    finally { setLogsLoading(false); }
  };

  const load = async () => {"""
content = content.replace(old_load, new_load, 1)

# 3. Adiciona tabs de navegacao antes do PageHeader
old_header = "        <PageHeader title=\"Painel Super Admin\" sub=\"Gestao de saloes, trials e acessos\" />"
new_header = """        {/* Tabs navegacao */}
        <div style={{ display:"flex", gap:4, marginBottom:28, borderBottom:`1px solid ${C.border}` }}>
          {[["tenants","Saloes"],["logs","Log de Acoes"]].map(([id,label]) => (
            <button key={id} onClick={() => { setSaTab(id as any); if (id === "logs") loadLogs(); }}
              style={{ padding:"10px 20px", background:"none", border:"none", borderBottom:`2px solid ${saTab===id?C.gold:"transparent"}`, color:saTab===id?C.gold:C.textMuted, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:FB, marginBottom:-1 }}>
              {label}
            </button>
          ))}
        </div>

        {saTab === "tenants" && <PageHeader title="Painel Super Admin" sub="Gestao de saloes, trials e acessos" />}
        {saTab === "logs" && <PageHeader title="Log de Acoes" sub="Historico de acoes em todos os saloes" />}"""
content = content.replace(old_header, new_header)

# 4. Envolve o conteudo de tenants em condicional e adiciona aba de logs
old_kpis = "        {/* KPIs */}\n        {stats && ("
new_kpis = "        {saTab === \"tenants\" && <>\n        {/* KPIs */}\n        {stats && ("
content = content.replace(old_kpis, new_kpis)

# Fecha o bloco de tenants antes do modal
old_modal = "      {/* Modal Gerenciar Tenant */}"
new_modal = "      </> }\n\n      {/* Aba Logs */}\n      {saTab === \"logs\" && (\n        <div>\n          {logsLoading ? (\n            <div style={{ textAlign:\"center\", padding:60, color:C.textMuted }}>Carregando...</div>\n          ) : saLogs.length === 0 ? (\n            <div style={{ textAlign:\"center\", padding:60, color:C.textMuted }}>Nenhum log encontrado.</div>\n          ) : (\n            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:\"hidden\" }}>\n              <table style={{ width:\"100%\", borderCollapse:\"collapse\" }}>\n                <thead>\n                  <tr style={{ background:C.surface }}>\n                    {[\"Data/Hora\",\"Salao\",\"Acao\",\"Tabela\",\"Detalhes\"].map(h => (\n                      <th key={h} style={{ padding:\"12px 16px\", textAlign:\"left\", fontSize:10, fontWeight:700, color:C.textMuted, textTransform:\"uppercase\", letterSpacing:\".08em\" }}>{h}</th>\n                    ))}\n                  </tr>\n                </thead>\n                <tbody>\n                  {saLogs.map((log: any, i: number) => (\n                    <tr key={log.id ?? i} style={{ borderTop:`1px solid ${C.border}` }}>\n                      <td style={{ padding:\"12px 16px\", fontSize:12, color:C.textMuted, whiteSpace:\"nowrap\" }}>{log.createdAt ? new Date(log.createdAt).toLocaleString(\"pt-BR\") : \"-\"}</td>\n                      <td style={{ padding:\"12px 16px\", fontSize:12, color:C.text }}>{log.tenantName ?? log.tenantId?.substring(0,8) ?? \"-\"}</td>\n                      <td style={{ padding:\"12px 16px\" }}><span style={{ fontSize:12, fontWeight:700, color:C.rose, padding:\"3px 10px\", borderRadius:20, background:`${C.rose}15` }}>{log.action}</span></td>\n                      <td style={{ padding:\"12px 16px\", fontSize:12, color:C.textMuted }}>{log.tableName ?? \"-\"}</td>\n                      <td style={{ padding:\"12px 16px\", fontSize:12, color:C.textMuted, maxWidth:280, overflow:\"hidden\", textOverflow:\"ellipsis\", whiteSpace:\"nowrap\" }}>{log.newData ? JSON.stringify(log.newData).substring(0,80) : \"-\"}</td>\n                    </tr>\n                  ))}\n                </tbody>\n              </table>\n            </div>\n          )}\n        </div>\n      )}\n\n      {/* Modal Gerenciar Tenant */}"
content = content.replace(old_modal, new_modal)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
