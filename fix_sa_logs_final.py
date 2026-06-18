# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adiciona estados
old1 = "  const [stats, setStats]     = useState<any>(null);\n  const [tenants, setTenants] = useState<any[]>([]);"
new1 = "  const [saTab, setSaTab]     = useState<string>(\"tenants\");\n  const [saLogs, setSaLogs]   = useState<any[]>([]);\n  const [logsLoading, setLogsLoading] = useState(false);\n  const [stats, setStats]     = useState<any>(null);\n  const [tenants, setTenants] = useState<any[]>([]);"
content = content.replace(old1, new1)

# 2. Adiciona loadLogs antes de load
old2 = "  const load = async () => {\n    setLoading(true);"
new2 = "  const loadLogs = async () => {\n    setLogsLoading(true);\n    try {\n      const res = await saFetch(\"GET\", \"/super-admin/audit-logs?limit=100\");\n      setSaLogs(res.data ?? []);\n    } catch(e) { console.error(e); }\n    finally { setLogsLoading(false); }\n  };\n\n  const load = async () => {\n    setLoading(true);"
content = content.replace(old2, new2)

# 3. Substitui PageHeader por tabs + pageheader condicional
old3 = "        <PageHeader title=\"Painel Super Admin\" sub=\"Gestao de saloes, trials e acessos\" />\n\n        {/* KPIs */"
new3 = "        <div style={{display:\"flex\",gap:4,marginBottom:24,borderBottom:`1px solid ${C.border}`}}>\n          {([[\"tenants\",\"Saloes\"],[\"logs\",\"Log de Acoes\"]] as [string,string][]).map(([id,label]) => (\n            <button key={id} onClick={() => { setSaTab(id); if(id===\"logs\") loadLogs(); }}\n              style={{padding:\"10px 20px\",background:\"none\",border:\"none\",borderBottom:`2px solid ${saTab===id?C.gold:\"transparent\"}`,color:saTab===id?C.gold:C.textMuted,fontSize:14,fontWeight:600,cursor:\"pointer\",fontFamily:FB,marginBottom:-1}}>\n              {label}\n            </button>\n          ))}\n        </div>\n\n        {saTab === \"tenants\" && (\n        <div>\n        {/* KPIs */"
content = content.replace(old3, new3)

# 4. Fecha div de tenants antes do Modal
old4 = "      {/* Modal Gerenciar Tenant */"
new4 = "        </div>)}\n\n        {saTab === \"logs\" && (\n          <div>\n            {logsLoading && <div style={{textAlign:\"center\",padding:60,color:C.textMuted}}>Carregando...</div>}\n            {!logsLoading && saLogs.length === 0 && <div style={{textAlign:\"center\",padding:60,color:C.textMuted}}>Nenhum log encontrado.</div>}\n            {!logsLoading && saLogs.length > 0 && (\n              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:\"hidden\"}}>\n                <table style={{width:\"100%\",borderCollapse:\"collapse\"}}>\n                  <thead><tr style={{background:C.surface}}>\n                    {[\"Data/Hora\",\"Salao\",\"Acao\",\"Tabela\",\"Detalhes\"].map(h => (\n                      <th key={h} style={{padding:\"12px 16px\",textAlign:\"left\",fontSize:10,fontWeight:700,color:C.textMuted,textTransform:\"uppercase\",letterSpacing:\".08em\"}}>{h}</th>\n                    ))}\n                  </tr></thead>\n                  <tbody>\n                    {saLogs.map((log: any, i: number) => (\n                      <tr key={log.id ?? i} style={{borderTop:`1px solid ${C.border}`}}>\n                        <td style={{padding:\"12px 16px\",fontSize:12,color:C.textMuted,whiteSpace:\"nowrap\"}}>{log.createdAt ? new Date(log.createdAt).toLocaleString(\"pt-BR\") : \"-\"}</td>\n                        <td style={{padding:\"12px 16px\",fontSize:12,color:C.text}}>{log.tenantName ?? \"-\"}</td>\n                        <td style={{padding:\"12px 16px\"}}><span style={{fontSize:12,fontWeight:700,color:C.rose,padding:\"3px 10px\",borderRadius:20,background:`${C.rose}15`}}>{log.action}</span></td>\n                        <td style={{padding:\"12px 16px\",fontSize:12,color:C.textMuted}}>{log.tableName ?? \"-\"}</td>\n                        <td style={{padding:\"12px 16px\",fontSize:12,color:C.textMuted,maxWidth:280,overflow:\"hidden\",textOverflow:\"ellipsis\",whiteSpace:\"nowrap\"}}>{log.newData ? JSON.stringify(log.newData).substring(0,80) : \"-\"}</td>\n                      </tr>\n                    ))}\n                  </tbody>\n                </table>\n              </div>\n            )}\n          </div>\n        )}\n\n      {/* Modal Gerenciar Tenant */"
content = content.replace(old4, new4, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
