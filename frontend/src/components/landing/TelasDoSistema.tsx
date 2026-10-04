import { useCallback, useEffect, useRef, useState } from "react";
import "./TelasDoSistema.css";

type Tela = { arquivo: string; titulo: string };

const TELAS: Tela[] = [
  { arquivo: "tela-01.jpg", titulo: "Dashboard" },
  { arquivo: "tela-02.jpg", titulo: "Desempenho" },
  { arquivo: "tela-03.jpg", titulo: "Agenda" },
  { arquivo: "tela-04.jpg", titulo: "Clientes" },
  { arquivo: "tela-05.jpg", titulo: "Profissionais" },
  { arquivo: "tela-06.jpg", titulo: "Serviços" },
  { arquivo: "tela-07.jpg", titulo: "Categorias de serviços" },
  { arquivo: "tela-08.jpg", titulo: "Pacotes" },
  { arquivo: "tela-09.jpg", titulo: "Financeiro" },
  { arquivo: "tela-10.jpg", titulo: "CRM — Pipeline" },
  { arquivo: "tela-11.jpg", titulo: "Fidelidade" },
  { arquivo: "tela-12.jpg", titulo: "WhatsApp" },
  { arquivo: "tela-13.jpg", titulo: "Automações" },
  { arquivo: "tela-14.jpg", titulo: "Configurações — Identidade" },
  { arquivo: "tela-15.jpg", titulo: "Configurações — Landing Page" },
  { arquivo: "tela-16.jpg", titulo: "Agendamento online do cliente" },
];

const caminho = (arquivo: string) => `/telas/${arquivo}`;

export default function TelasDoSistema() {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const [aberta, setAberta] = useState<number | null>(null);
  // Zoom da tela ampliada: clique na imagem aproxima (com rolagem para ver os detalhes) e clique de novo volta.
  const [zoom, setZoom] = useState(false);

  const abrir = (i: number) => { setZoom(false); setAberta(i); };
  const fechar = () => { setZoom(false); setAberta(null); };

  const rolar = (direcao: 1 | -1) => {
    const trilho = trilhoRef.current;
    if (trilho) trilho.scrollBy({ left: direcao * trilho.clientWidth, behavior: "smooth" });
  };

  const navegar = useCallback((direcao: 1 | -1) => {
    setZoom(false);
    setAberta((atual) => (atual === null ? null : (atual + direcao + TELAS.length) % TELAS.length));
  }, []);

  const aberto = aberta !== null;
  useEffect(() => {
    if (!aberto) return;
    const teclado = (e: KeyboardEvent) => {
      // Esc primeiro sai do zoom; com a tela já no tamanho normal, fecha.
      if (e.key === "Escape") {
        if (zoom) setZoom(false);
        else setAberta(null);
      }
      if (!zoom && e.key === "ArrowRight") navegar(1);
      if (!zoom && e.key === "ArrowLeft") navegar(-1);
    };
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, [aberto, zoom, navegar]);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [aberto]);

  return (
    <section id="telas" className="telas">
      <h2 className="telas-titulo">Telas do sistema</h2>
      <p className="telas-subtitulo">Conheça o ZenSalon por dentro. Clique em uma tela para ampliar.</p>

      <div className="telas-carrossel">
        <button type="button" className="telas-seta" onClick={() => rolar(-1)} aria-label="Telas anteriores">
          ‹
        </button>
        <div className="telas-trilho" ref={trilhoRef}>
          {TELAS.map((tela, i) => (
            <figure key={tela.arquivo} className="telas-item">
              <button type="button" className="telas-botao" onClick={() => abrir(i)}>
                <img src={caminho(tela.arquivo)} alt={`Tela ${tela.titulo} do ZenSalon`} loading="lazy" />
              </button>
              <figcaption>{tela.titulo}</figcaption>
            </figure>
          ))}
        </div>
        <button type="button" className="telas-seta" onClick={() => rolar(1)} aria-label="Próximas telas">
          ›
        </button>
      </div>

      {aberta !== null && (
        <div
          className={`telas-ampliada${zoom ? " zoom" : ""}`}
          role="dialog"
          aria-modal="true"
          onClick={() => (zoom ? setZoom(false) : fechar())}
        >
          <button
            type="button"
            className="telas-ampliada-seta esquerda"
            onClick={(e) => { e.stopPropagation(); navegar(-1); }}
            aria-label="Tela anterior"
          >
            ‹
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img
              src={caminho(TELAS[aberta].arquivo)}
              alt={`Tela ${TELAS[aberta].titulo} do ZenSalon`}
              onClick={() => setZoom((z) => !z)}
              title={zoom ? "Clique para voltar ao tamanho normal" : "Clique para aproximar"}
            />
            <figcaption>
              {TELAS[aberta].titulo} · {aberta + 1}/{TELAS.length}
              <span className="telas-dica">{zoom ? "Toque na imagem para voltar" : "Toque na imagem para aproximar"}</span>
            </figcaption>
          </figure>
          <button
            type="button"
            className="telas-ampliada-seta direita"
            onClick={(e) => { e.stopPropagation(); navegar(1); }}
            aria-label="Próxima tela"
          >
            ›
          </button>
          <button type="button" className="telas-fechar" onClick={(e) => { e.stopPropagation(); fechar(); }} aria-label="Fechar">
            ×
          </button>
        </div>
      )}
    </section>
  );
}
