import { useState } from "react";

const profiles = [
  { id: "client", emoji: "👤", title: "Sou cliente", sub: "Quero agendar um serviço", href: "/buscar", color: "#c9a96e" },
  { id: "salon",  emoji: "✂️", title: "Tenho um salão", sub: "Quero gerenciar meu negócio", href: "https://beautytech-v2.vercel.app", color: "#e8a598" },
  { id: "barber", emoji: "💈", title: "Tenho uma barbearia", sub: "Quero gerenciar meu negócio", href: "https://beautytech-v2.vercel.app", color: "#7eb8d4" },
  { id: "clinic", emoji: "💆", title: "Tenho uma clínica", sub: "Clínica estética ou spa", href: "https://beautytech-v2.vercel.app", color: "#a8c5a0" },
];

export default function HomePage() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const handleClick = (profile: typeof profiles[0]) => {
    setSelected(profile.id);
    setTimeout(() => { window.location.href = profile.href; }, 400);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#080808", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Outfit', sans-serif", padding:"40px 20px", position:"relative", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,400&family=Outfit:wght@300;400;500;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cardIn { from { opacity:0; transform:translateY(32px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes selectPulse { 0% { box-shadow:0 0 0 0px rgba(201,169,110,0.6); } 100% { box-shadow:0 0 0 18px rgba(201,169,110,0); } }
        .pcard { animation:cardIn 0.6s ease both; cursor:pointer; border-radius:20px; border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.03); padding:32px 28px; transition:transform 0.25s ease, border-color 0.25s ease, background 0.25s ease; text-align:center; position:relative; overflow:hidden; }
        .pcard:hover { transform:translateY(-6px); }
        .pcard.sel { animation:selectPulse 0.5s ease forwards; }
      `}</style>

      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 70% 50% at 50% 0%, rgba(201,169,110,0.08) 0%, transparent 70%)" }} />

      <div style={{ animation:"fadeUp 0.7s ease both", textAlign:"center", marginBottom:60 }}>
        <div style={{ fontSize:11, letterSpacing:"0.35em", color:"#c9a96e", textTransform:"uppercase", marginBottom:14, opacity:0.8 }}>Bem-vindo ao</div>
        <h1 style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"clamp(48px, 8vw, 80px)", fontWeight:300, color:"#fff", letterSpacing:"-0.02em", lineHeight:1, marginBottom:16 }}>
          Zen<span style={{ color:"#c9a96e", fontStyle:"italic" }}>Salon</span>
        </h1>
        <p style={{ fontSize:15, color:"rgba(255,255,255,0.4)", fontWeight:300, letterSpacing:"0.05em" }}>
          Plataforma de gestão e agendamento para beleza e estética
        </p>
      </div>

      <div style={{ animation:"fadeUp 0.7s 0.15s ease both", textAlign:"center", marginBottom:40 }}>
        <p style={{ fontSize:"clamp(18px, 3vw, 22px)", color:"rgba(255,255,255,0.75)", fontWeight:300, letterSpacing:"0.02em" }}>
          Como você se identifica?
        </p>
        <div style={{ width:40, height:1, background:"linear-gradient(90deg, transparent, #c9a96e, transparent)", margin:"16px auto 0" }} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, width:"100%", maxWidth:860, animation:"fadeUp 0.7s 0.25s ease both" }}>
        {profiles.map((p, i) => (
          <div key={p.id}
            className={`pcard${selected === p.id ? " sel" : ""}`}
            style={{ animationDelay:`${0.3 + i * 0.08}s`, borderColor: hovered === p.id || selected === p.id ? `${p.color}60` : "rgba(255,255,255,0.07)", background: selected === p.id ? `${p.color}18` : hovered === p.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)" }}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleClick(p)}
          >
            <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"60%", height:1, background:`linear-gradient(90deg, transparent, ${p.color}80, transparent)`, opacity: hovered === p.id || selected === p.id ? 1 : 0, transition:"opacity 0.3s" }} />
            <div style={{ fontSize:36, marginBottom:16, transition:"transform 0.3s", transform: hovered === p.id ? "scale(1.1)" : "scale(1)", display:"inline-block" }}>{p.emoji}</div>
            <div style={{ fontSize:16, fontWeight:600, color: hovered === p.id || selected === p.id ? p.color : "rgba(255,255,255,0.85)", marginBottom:8, transition:"color 0.25s" }}>{p.title}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontWeight:300, lineHeight:1.5 }}>{p.sub}</div>
            <div style={{ marginTop:20, fontSize:18, color:p.color, opacity: hovered === p.id ? 1 : 0, transform: hovered === p.id ? "translateX(0)" : "translateX(-6px)", transition:"opacity 0.25s, transform 0.25s" }}>→</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:64, animation:"fadeUp 0.7s 0.6s ease both", textAlign:"center" }}>
        <p style={{ fontSize:11, color:"rgba(255,255,255,0.2)", letterSpacing:"0.1em" }}>
          ZENSALON · GESTÃO INTELIGENTE PARA SALÕES, BARBEARIAS E CLÍNICAS
        </p>
        <p style={{ fontSize:11, color:"rgba(255,255,255,0.2)", marginTop:6, display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
          <a href="https://www.websitelog.com.br" target="_blank" style={{ color:"rgba(255,255,255,0.3)", textDecoration:"none" }}>www.websitelog.com.br</a>
          <span>|</span>
          <a href="mailto:websitelogx@gmail.com" style={{ color:"rgba(255,255,255,0.3)", textDecoration:"none" }}>websitelogx@gmail.com</a>
          <span>|</span>
          <a href="https://wa.me/5534997824990" target="_blank" style={{ color:"rgba(255,255,255,0.3)", textDecoration:"none" }}>WhatsApp: (34) 99782-4990</a>
        </p>
      </div>
    </div>
  );
}
