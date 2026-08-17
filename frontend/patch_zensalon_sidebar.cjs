const fs = require("fs");
const path = "src/App.tsx";
let content = fs.readFileSync(path, "utf-8");

const patches = [];

// 0) App: adicionar useIsMobile logo apos useTheme()
patches.push([
`export default function App() {
  useTheme();`,
`export default function App() {
  useTheme();
  const isMobile = useIsMobile();`
]);

// 1) Adicionar isMobile + drawerOpen no início da função Sidebar
patches.push([
`function Sidebar({ page, setPage, user, tenantInfo, onLogout }: any) {
  const themeId = useTheme();
  const [showThemes, setShowThemes] = useState(false);`,
`function Sidebar({ page, setPage, user, tenantInfo, onLogout }: any) {
  const themeId = useTheme();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);`
]);

// 2) Sidebar div: abrir Fragment + hamburguer + backdrop + transform condicional
patches.push([
`  return (
    <div style={{ width:220, minHeight:"100vh", background: C.card, borderRight:\`1px solid \${C.border}\`, display:"flex", flexDirection:"column", position:"fixed", left:0, top:0, bottom:0, zIndex:100, fontFamily: FB }}>`,
`  return (
    <>
      {isMobile && (
        <button onClick={() => setDrawerOpen(v => !v)} style={{ position:"fixed", top:14, left:14, zIndex:200, width:40, height:40, borderRadius:10, border:\`1px solid \${C.border}\`, background:C.card, color:C.text, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {drawerOpen ? "✕" : "☰"}
        </button>
      )}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:99 }} />
      )}
    <div style={{ width:220, minHeight:"100vh", background: C.card, borderRight:\`1px solid \${C.border}\`, display:"flex", flexDirection:"column", position:"fixed", left:0, top:0, bottom:0, zIndex:100, fontFamily: FB, transform: isMobile ? (drawerOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)", transition:"transform 0.25s ease" }}>`
]);

// 3) onClick do item do menu: fechar drawer em mobile depois de navegar
patches.push([
`                <button key={m.id} onClick={() => { if (locked) { alert("Este recurso requer plano pago. Acesse Planos para fazer upgrade."); return; } if (m.id === "ajuda") { window.open("/manual/Manual_ZenSalon.pdf", "_blank", "noopener,noreferrer"); return; } setPage(m.id); }}`,
`                <button key={m.id} onClick={() => { if (locked) { alert("Este recurso requer plano pago. Acesse Planos para fazer upgrade."); return; } if (m.id === "ajuda") { window.open("/manual/Manual_ZenSalon.pdf", "_blank", "noopener,noreferrer"); return; } setPage(m.id); if (isMobile) setDrawerOpen(false); }}`
]);

// 4) Fechamento da função Sidebar: fechar o <div> extra do Fragment que abrimos
patches.push([
`        <button onClick={onLogout} style={{ background:"none", border:"none", color:C.ruby, fontSize:14, cursor:"pointer", padding:0, fontFamily:FB }}>Sair</button>
      </div>
    </div>
  );
}
// --- APP -----------------------------------------------------`,
`        <button onClick={onLogout} style={{ background:"none", border:"none", color:C.ruby, fontSize:14, cursor:"pointer", padding:0, fontFamily:FB }}>Sair</button>
      </div>
    </div>
    </>
  );
}
// --- APP -----------------------------------------------------`
]);

// 5) <main>: marginLeft/padding condicional (0/16px em mobile, 220/36 em desktop)
patches.push([
`      <main style={{ marginLeft:220, padding:36, minHeight:"100vh", background: C.bg }}>`,
`      <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? "70px 16px 16px" : 36, minHeight:"100vh", background: C.bg }}>`
]);

let errors = [];
for (const [oldStr, newStr] of patches) {
  const count = content.split(oldStr).length - 1;
  if (count !== 1) {
    errors.push(`Bloco nao encontrado 1x (encontrado ${count}x): ${oldStr.slice(0, 60)}...`);
  } else {
    content = content.split(oldStr).join(newStr);
  }
}

if (errors.length) {
  console.log("[ERRO]\n" + errors.join("\n"));
  process.exit(1);
}

fs.writeFileSync(path, content, "utf-8");
console.log("[OK] Todos os patches aplicados com sucesso");
