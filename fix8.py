content = open('frontend/src/TenantSettingsPage.tsx', 'r', encoding='latin-1').read()
old = '      <div style={{ display:"flex", gap:4, marginBottom:28, borderBottom:`1px solid ${C.border}` }}>'
new = '      <div style={{ display:"flex", gap:4, marginBottom:28, borderBottom:`1px solid ${C.border}`, background:C.card, borderRadius:"12px 12px 0 0", padding:"4px 4px 0 4px" }}>'
content = content.replace(old, new)
open('frontend/src/TenantSettingsPage.tsx', 'w', encoding='latin-1').write(content)
print('OK')
