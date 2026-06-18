# -*- coding: utf-8 -*-

# Cria componente separado
modal_path = r"C:\projetos\beautytech-v2\frontend\src\SuperAdminLogsModal.tsx"

modal_content = '''import { useState, useEffect } from "react";

const C = {
  bg: "#0B0F1A", card: "#141826", border: "rgba(255,255,255,0.07)",
  rose: "#C9847A", gold: "#C9A96E", sage: "#7EB8A0",
  text: "#E2E8F0", textMuted: "#94A3B8", surface: "#0F1320",
};
const FB = "'Outfit', sans-serif";

export default function SuperAdminLogsModal({ base, token, onClose }: { base: string; token: string; onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${base}/api/v1/super-admin/audit-logs?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => setLogs(d.data ?? [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, width:"100%", maxWidth:900, maxHeight:"85vh", display:"flex", flexDirection:"column", fontFamily:FB }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:C.text }}>Log de Acoes</div>
            <div style={{ fontSize:12, color:C.textMuted }}>Historico de acoes em todos os saloes</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.textMuted, fontSize:20, cursor:"pointer" }}>x</button>
        </div>
        <div style={{ overflow:"auto", flex:1 }}>
          {loading && <div style={{ textAlign:"center", padding:60, color:C.textMuted }}>Carregando...</div>}
          {!loading && logs.length === 0 && <div style={{ textAlign:"center", padding:60, color:C.textMuted }}>Nenhum log encontrado.</div>}
          {!loading && logs.length > 0 && (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead style={{ position:"sticky", top:0 }}>
                <tr style={{ background:C.surface }}>
                  {["Data/Hora","Salao","Acao","Tabela","Detalhes"].map(h => (
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:".08em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, i: number) => (
                  <tr key={log.id ?? i} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted, whiteSpace:"nowrap" }}>{log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : "-"}</td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:C.text }}>{log.tenantName ?? "-"}</td>
                    <td style={{ padding:"12px 16px" }}><span style={{ fontSize:12, fontWeight:700, color:C.rose, padding:"3px 10px", borderRadius:20, background:`${C.rose}15` }}>{log.action}</span></td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted }}>{log.tableName ?? "-"}</td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted, maxWidth:250, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.newData ? JSON.stringify(log.newData).substring(0,80) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
'''

with open(modal_path, "w", encoding="utf-8") as f:
    f.write(modal_content)
print(f"OK - modal criado")

# Modifica App.tsx minimamente
app_path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# Adiciona import
content = content.replace(
    "import BookingPage from './BookingPage';",
    "import BookingPage from './BookingPage';\nimport SuperAdminLogsModal from './SuperAdminLogsModal';"
)

# Adiciona estado showLogs no SuperAdminDashboard
content = content.replace(
    "  const [stats, setStats]     = useState<any>(null);",
    "  const [showLogs, setShowLogs] = useState(false);\n  const [stats, setStats]     = useState<any>(null);"
)

# Adiciona botao "Log de Acoes" no header do Super Admin
content = content.replace(
    '          <a href="/" style={{ fontSize:12, color:C.textMuted, textDecoration:"none" }}>? Sistema</a>\n          <button onClick={onLogout}',
    '          <button onClick={() => setShowLogs(true)} style={{ background:"none", border:`1px solid ${C.gold}40`, borderRadius:8, color:C.gold, fontSize:12, cursor:"pointer", fontFamily:FB, padding:"6px 14px" }}>Log de Acoes</button>\n          <a href="/" style={{ fontSize:12, color:C.textMuted, textDecoration:"none" }}>? Sistema</a>\n          <button onClick={onLogout}'
)

# Adiciona o modal antes do PlanSettingsPanel
content = content.replace(
    "      <PlanSettingsPanel saFetch={saFetch} />",
    "      {showLogs && <SuperAdminLogsModal base={base} token={token} onClose={() => setShowLogs(false)} />}\n      <PlanSettingsPanel saFetch={saFetch} />"
)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK - App.tsx atualizado")
