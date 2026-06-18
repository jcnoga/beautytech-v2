# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove a aba de logs e fragment do lugar errado (apos </Modal>)
old_wrong = """        </> }

      {/* Aba Logs */}
      {saTab === "logs" && (
        <div>
          {logsLoading ? (
            <div style={{ textAlign:"center", padding:60, color:C.textMuted }}>Carregando...</div>
          ) : saLogs.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, color:C.textMuted }}>Nenhum log encontrado.</div>
          ) : (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:C.surface }}>
                    {["Data/Hora","Salao","Acao","Tabela","Detalhes"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:".08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {saLogs.map((log: any, i: number) => (
                    <tr key={log.id ?? i} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted, whiteSpace:"nowrap" }}>{log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : "-"}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.text }}>{log.tenantName ?? log.tenantId?.substring(0,8) ?? "-"}</td>
                      <td style={{ padding:"12px 16px" }}><span style={{ fontSize:12, fontWeight:700, color:C.rose, padding:"3px 10px", borderRadius:20, background:`${C.rose}15` }}>{log.action}</span></td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted }}>{log.tableName ?? "-"}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted, maxWidth:280, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.newData ? JSON.stringify(log.newData).substring(0,80) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Gerenciar Tenant */}"""

new_correct = "      {/* Modal Gerenciar Tenant */}"

content = content.replace(old_wrong, new_correct)

# Agora insere no lugar correto - dentro do div de padding, antes do Modal
old_before_modal = "      </Modal>\n      <PlanSettingsPanel saFetch={saFetch} />\n    </div>"
new_before_modal = """      </Modal>

      {/* Aba Logs */}
      {saTab === "logs" && (
        <div>
          {logsLoading ? (
            <div style={{ textAlign:"center", padding:60, color:C.textMuted }}>Carregando...</div>
          ) : saLogs.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, color:C.textMuted }}>Nenhum log encontrado.</div>
          ) : (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:C.surface }}>
                    {["Data/Hora","Salao","Acao","Tabela","Detalhes"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:".08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {saLogs.map((log: any, i: number) => (
                    <tr key={log.id ?? i} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted, whiteSpace:"nowrap" }}>{log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : "-"}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.text }}>{log.tenantName ?? log.tenantId?.substring(0,8) ?? "-"}</td>
                      <td style={{ padding:"12px 16px" }}><span style={{ fontSize:12, fontWeight:700, color:C.rose, padding:"3px 10px", borderRadius:20, background:`${C.rose}15` }}>{log.action}</span></td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted }}>{log.tableName ?? "-"}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted, maxWidth:280, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.newData ? JSON.stringify(log.newData).substring(0,80) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <PlanSettingsPanel saFetch={saFetch} />
    </div>"""

content = content.replace(old_before_modal, new_before_modal)

# Remove o fragment incorreto que ainda pode estar la
content = content.replace("        </> }\n\n      {/* Modal Gerenciar Tenant */}", "      {/* Modal Gerenciar Tenant */}")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
