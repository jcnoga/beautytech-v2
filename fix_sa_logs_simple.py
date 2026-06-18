# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adiciona estados no SuperAdminDashboard
old = "  const [stats, setStats]     = useState<any>(null);\n  const [tenants, setTenants] = useState<any[]>([]);"
new = "  const [saTab, setSaTab]     = useState<string>('tenants');\n  const [saLogs, setSaLogs]   = useState<any[]>([]);\n  const [logsLoading, setLogsLoading] = useState(false);\n  const [stats, setStats]     = useState<any>(null);\n  const [tenants, setTenants] = useState<any[]>([]);"
content = content.replace(old, new)

# 2. Adiciona funcao loadLogs antes de load
old_load = "  const load = async () => {\n    setLoading(true);"
new_load = """  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await saFetch("GET", "/super-admin/audit-logs?limit=100");
      setSaLogs(res.data ?? []);
    } catch(e) { console.error(e); }
    finally { setLogsLoading(false); }
  };

  const load = async () => {
    setLoading(true);"""
content = content.replace(old_load, new_load)

# 3. Adiciona tabs antes do PageHeader
old_ph = '        <PageHeader title="Painel Super Admin" sub="Gestao de saloes, trials e acessos" />'
new_ph = '''        <div style={{ display:"flex", gap:4, marginBottom:24, borderBottom:`1px solid ${C.border}` }}>
          {[["tenants","Saloes"],["logs","Log de Acoes"]].map(([id,label]) => (
            <button key={id} onClick={() => { setSaTab(id); if (id === "logs") loadLogs(); }}
              style={{ padding:"10px 20px", background:"none", border:"none", borderBottom:`2px solid ${saTab===id?C.gold:"transparent"}`, color:saTab===id?C.gold:C.textMuted, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:FB, marginBottom:-1 }}>
              {label}
            </button>
          ))}
        </div>
        {saTab === "tenants" && <PageHeader title="Painel Super Admin" sub="Gestao de saloes, trials e acessos" />}
        {saTab === "logs" && <PageHeader title="Log de Acoes" sub="Historico de acoes em todos os saloes" />}'''
content = content.replace(old_ph, new_ph)

# 4. Envolve KPIs e tabela em condicional saTab
old_kpis = "        {/* KPIs */}\n        {stats && ("
new_kpis = "        {saTab === \"tenants\" && <div>\n        {/* KPIs */}\n        {stats && ("
content = content.replace(old_kpis, new_kpis)

# 5. Fecha o div de tenants e adiciona aba logs antes do Modal
old_before_modal = "      {/* Modal Gerenciar Tenant */}"
new_before_modal = """        </div>}

        {saTab === "logs" && <div>
          {logsLoading && <div style={{ textAlign:"center", padding:60, color:C.textMuted }}>Carregando...</div>}
          {!logsLoading && saLogs.length === 0 && <div style={{ textAlign:"center", padding:60, color:C.textMuted }}>Nenhum log encontrado.</div>}
          {!logsLoading && saLogs.length > 0 && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" as const }}>
                <thead><tr style={{ background:C.surface }}>
                  {["Data/Hora","Salao","Acao","Tabela","Detalhes"].map(h => (
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left" as const, fontSize:10, fontWeight:700, color:C.textMuted, textTransform:"uppercase" as const, letterSpacing:".08em" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {saLogs.map((log: any, i: number) => (
                    <tr key={log.id ?? i} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted, whiteSpace:"nowrap" as const }}>{log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : "-"}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.text }}>{log.tenantName ?? "-"}</td>
                      <td style={{ padding:"12px 16px" }}><span style={{ fontSize:12, fontWeight:700, color:C.rose, padding:"3px 10px", borderRadius:20, background:`${C.rose}15` }}>{log.action}</span></td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted }}>{log.tableName ?? "-"}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted, maxWidth:280, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{log.newData ? JSON.stringify(log.newData).substring(0,80) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>}

      {/* Modal Gerenciar Tenant */}"""
content = content.replace(old_before_modal, new_before_modal)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
