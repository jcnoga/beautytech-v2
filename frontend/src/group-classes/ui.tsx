// Componentes visuais das telas de Aulas em turma. Usam o tema atual do ZenSalon (C, FD, FB vêm do App),
// então seguem o tema escolhido pelo usuário. Pensados para funcionar no celular.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

export type Theme = { C: any; FD: string; FB: string };

export const LEVEL_LABELS: Record<string, string> = { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" };
export const STUDENT_STATUS: Record<string, { label: string; color: (C: any) => string }> = {
  active:    { label: "Ativo",     color: (C) => C.sage },
  paused:    { label: "Pausado",   color: (C) => C.gold },
  inactive:  { label: "Inativo",   color: (C) => C.textMuted },
  cancelled: { label: "Cancelado", color: (C) => C.ruby },
};
export const ENROLLMENT_STATUS: Record<string, { label: string; color: (C: any) => string }> = {
  active:    { label: "Ativa",     color: (C) => C.sage },
  paused:    { label: "Pausada",   color: (C) => C.gold },
  ended:     { label: "Encerrada", color: (C) => C.textMuted },
  cancelled: { label: "Cancelada", color: (C) => C.ruby },
};
export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const BOOKING_KIND: Record<string, string> = { fixed: "Fixo", credit: "Crédito", makeup: "Reposição" };
export const BOOKING_STATUS: Record<string, { label: string; color: (C: any) => string }> = {
  booked:           { label: "Inscrito",            color: (C) => C.textMuted },
  present:          { label: "Presente",            color: (C) => C.sage },
  absent:           { label: "Falta",               color: (C) => C.ruby },
  excused:          { label: "Falta justificada",   color: (C) => C.gold },
  cancelled:        { label: "Cancelou no prazo",   color: (C) => C.textMuted },
  cancelled_late:   { label: "Cancelou fora do prazo", color: (C) => C.ruby },
  cancelled_studio: { label: "Aula cancelada pelo studio", color: (C) => C.textMuted },
  paused:           { label: "Plano pausado",       color: (C) => C.gold },
};

/** Dia (AAAA-MM-DD) + n dias, sem fuso (conta em UTC só para andar no calendário). */
export const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
/** Dia da semana (0 = domingo) de um AAAA-MM-DD. */
export const weekday = (d: string) => new Date(d + "T00:00:00Z").getUTCDay();

export const brl = (v: unknown) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
/** Hoje (AAAA-MM-DD) no fuso de Brasília. */
export const todaySP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
/** AAAA-MM-DD → DD/MM/AAAA (sem passar por fuso). */
export const fmtDay = (d?: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "-");

export function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 700);
  useEffect(() => {
    const on = () => setM(window.innerWidth < 700);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return m;
}

export function PageHeader({ C, FD, title, subtitle, action }: Theme & { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
      <div>
        <h1 style={{ fontFamily: FD, fontSize: 28, color: C.text, margin: 0 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Button({ C, FB, children, onClick, variant = "primary", small, disabled, type = "button", style }: Theme & {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger"; small?: boolean;
  disabled?: boolean; type?: "button" | "submit"; style?: CSSProperties;
}) {
  const bg = variant === "primary" ? C.rose : variant === "danger" ? `${C.ruby}22` : "transparent";
  const color = variant === "primary" ? "#fff" : variant === "danger" ? C.ruby : C.text;
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ padding: small ? "7px 12px" : "11px 18px", minHeight: small ? 34 : 42, borderRadius: 10, fontSize: small ? 12 : 14, fontWeight: 600,
        fontFamily: FB, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, background: bg, color,
        border: variant === "primary" ? "none" : `1px solid ${variant === "danger" ? C.ruby + "55" : C.border}`, ...style }}>
      {children}
    </button>
  );
}

export function Field({ C, label, children, hint }: { C: any; label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.textSec, marginBottom: 6 }}>{label}</span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 12, fontWeight: 400, color: C.textSec, marginTop: 4 }}>{hint}</span>}
    </label>
  );
}

export const inputStyle = (C: any, FB: string): CSSProperties => ({
  width: "100%", padding: "10px 12px", minHeight: 42, borderRadius: 10, border: `1px solid ${C.border}`,
  background: C.surface, color: C.text, fontSize: 14, fontWeight: 400, fontFamily: FB, boxSizing: "border-box",
});

export function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color, background: `${color}1F`, border: `1px solid ${color}40`,
    padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{label}</span>;
}

export function Card({ C, children, onClick, style }: { C: any; children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined}
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}

export function Modal({ C, FD, open, title, onClose, children, width = 640 }: Theme & {
  open: boolean; title: string; onClose: () => void; children: ReactNode; width?: number;
}) {
  const mobile = useIsMobile();
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex",
      alignItems: mobile ? "stretch" : "flex-start", justifyContent: "center", padding: mobile ? 0 : "40px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}
        style={{ background: C.card, border: `1px solid ${C.borderHi ?? C.border}`, borderRadius: mobile ? 0 : 18, width: "100%", maxWidth: mobile ? "none" : width,
          padding: mobile ? "18px 16px 28px" : 24, minHeight: mobile ? "100vh" : undefined, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: C.text }}>{title}</div>
          <button onClick={onClose} aria-label="Fechar" style={{ background: "transparent", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer", minWidth: 40, minHeight: 40 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Section({ C, title, children }: { C: any; title: string; children: ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 6, marginBottom: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  const mobile = useIsMobile();
  return <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : `repeat(${cols}, 1fr)`, gap: "0 14px" }}>{children}</div>;
}

export function Notice({ C, kind = "error", children }: { C: any; kind?: "error" | "info"; children: ReactNode }) {
  const color = kind === "error" ? C.ruby : C.sapphire ?? C.gold;
  return <div style={{ background: `${color}14`, border: `1px solid ${color}40`, color, borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>{children}</div>;
}

export function Empty({ C, children }: { C: any; children: ReactNode }) {
  return <div style={{ textAlign: "center", color: C.textMuted, padding: "48px 16px", fontSize: 14 }}>{children}</div>;
}
