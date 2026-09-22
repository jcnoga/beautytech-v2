// ============================================================
// ZENSALON — Botão "Instalar app" (PWA), com destaque
// ============================================================
// Android/Chrome/Edge: captura o evento beforeinstallprompt e
// dispara o prompt nativo de instalação ao clicar.
// iOS/Safari: não existe esse evento (limitação da Apple) — o
// botão abre um passo a passo simples ("compartilhar → adicionar
// à tela de início") em vez de fingir que instala sozinho.
// Já instalado (modo standalone): o botão nem aparece.
// ============================================================
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const COLORS = {
  surface: "#0F1320",
  border: "rgba(255,255,255,0.07)",
  gold: "#C9A96E",
  goldDim: "rgba(201,169,110,0.18)",
  text: "#EEE9E2",
  muted: "rgba(238,233,226,0.45)",
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (window.navigator as any).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [showIosHelp, setShowIosHelp] = useState(false);
  const ios = isIos();

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (installed) return null;
  // Sem prompt disponível e não é iOS: navegador não suporta
  // instalação (ex: Firefox desktop) — não mostra o botão.
  if (!deferredPrompt && !ios) return null;

  async function handleClick() {
    if (ios) {
      setShowIosHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <>
      <style>{`
        @keyframes zsInstallPulse { 0%, 100% { box-shadow: 0 0 20px rgba(201,169,110,0.25); } 50% { box-shadow: 0 0 32px rgba(201,169,110,0.55); } }
        .zs-btn-install {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${COLORS.goldDim}; color: ${COLORS.gold};
          border: 1.5px solid ${COLORS.gold}; border-radius: 10px;
          padding: 12.5px 26px; font-weight: 700; font-size: 15px;
          cursor: pointer; animation: zsInstallPulse 2.4s ease-in-out infinite;
          transition: transform .15s;
        }
        .zs-btn-install:hover { transform: translateY(-1px); }
      `}</style>

      <button type="button" onClick={handleClick} className="zs-btn-install">
        <Download size={16} />
        Instalar app
      </button>

      {showIosHelp && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowIosHelp(false)}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "16px 16px 0 0",
              padding: "24px 20px 28px",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <strong style={{ fontSize: 16, color: COLORS.text }}>Instalar no iPhone/iPad</strong>
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                aria-label="Fechar"
                style={{ background: "transparent", border: "none", color: COLORS.muted, cursor: "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, color: COLORS.text, fontSize: 14.5, lineHeight: 1.8 }}>
              <li>
                Toque no ícone de compartilhar <Share size={14} style={{ verticalAlign: "middle" }} /> na barra do Safari.
              </li>
              <li>Escolha <strong>"Adicionar à Tela de Início"</strong>.</li>
              <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
