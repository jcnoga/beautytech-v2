import { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ExternalLink,
  Search,
  FileText,
  HelpCircle,
  CheckCircle,
  Phone,
} from 'lucide-react';

// ─── FAQ Data ────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    category: 'Acesso',
    items: [
      {
        q: 'Como recuperar minha senha?',
        a: 'Na tela de login, clique em "Esqueci minha senha", informe seu e-mail e siga as instruções enviadas. O link expira em 2 horas.',
      },
      {
        q: 'Posso usar no celular?',
        a: 'Sim! O ZenSalon funciona em qualquer celular, tablet ou computador pelo navegador, sem precisar instalar nada.',
      },
      {
        q: 'Como criar usuário para minha funcionária?',
        a: 'Vá em Configurações > Usuários, clique em Novo Usuário, informe o e-mail e escolha o tipo de acesso.',
      },
    ],
  },
  {
    category: 'Agendamentos',
    items: [
      {
        q: 'Como criar um agendamento?',
        a: 'Vá em Agendamentos > Novo Agendamento, selecione cliente, serviço, profissional, data e horário. Clique em Salvar.',
      },
      {
        q: 'Como cancelar um agendamento?',
        a: 'Abra o agendamento desejado, clique em Cancelar Agendamento e confirme. O histórico é mantido.',
      },
      {
        q: 'O cliente pode agendar sozinho?',
        a: 'Sim! Compartilhe o link público do seu salão e o cliente agenda online sem precisar ligar.',
      },
      {
        q: 'O sistema envia lembrete automático?',
        a: 'Sim. O ZenSalon envia lembrete 24h e 2h antes do horário pelo WhatsApp automaticamente.',
      },
    ],
  },
  {
    category: 'WhatsApp',
    items: [
      {
        q: 'Como conectar o WhatsApp?',
        a: 'Vá em Configurações > WhatsApp, clique em Conectar e escaneie o QR Code com o celular.',
      },
      {
        q: 'O que fazer se o WhatsApp desconectar?',
        a: 'Vá em Configurações > WhatsApp e reconecte pelo QR Code. Isso pode ocorrer se o celular ficar sem internet.',
      },
      {
        q: 'Posso personalizar as mensagens automáticas?',
        a: 'Sim. Vá em Configurações > WhatsApp > Templates e edite os textos mantendo as variáveis entre chaves: {nome}, {servico}, {data}, {hora}.',
      },
    ],
  },
  {
    category: 'Financeiro',
    items: [
      {
        q: 'Posso cobrar pelo sistema?',
        a: 'Sim. O sistema aceita Pix e cartão de crédito/débito. No agendamento, clique em Cobrar Cliente e escolha a forma.',
      },
      {
        q: 'Como gerar um relatório financeiro?',
        a: 'Vá em Financeiro, escolha o período e clique em Gerar Relatório. É possível exportar em PDF.',
      },
      {
        q: 'Como registrar pagamento em dinheiro?',
        a: 'No agendamento, clique em Registrar Pagamento e escolha a opção Dinheiro.',
      },
    ],
  },
];

// ─── Quick Tips ───────────────────────────────────────────────────────────────
const QUICK_TIPS = [
  'Cadastre o WhatsApp do cliente com DDD para os lembretes funcionarem.',
  'Configure os horários de cada profissional para evitar conflitos na agenda.',
  'Revise o Dashboard toda manhã para ver os agendamentos do dia.',
  'Use o link público do salão para clientes agendarem sozinhos.',
  'Adicione observações sobre alergias e preferências no cadastro do cliente.',
  'Saia do sistema ao terminar de usar em computadores compartilhados.',
];

// ─── FAQ Item Component ───────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-purple-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-800">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-purple-500 flex-shrink-0 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 bg-purple-50 border-t border-gray-100">
          <p className="text-sm text-gray-700 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HelpPage() {
  const [search, setSearch] = useState('');

  const PDF_URL = '/manual/Manual_ZenSalon.pdf';

  const filteredFaq = FAQ_ITEMS.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-purple-700 to-purple-900 text-white px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <HelpCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Central de Ajuda</h1>
          <p className="text-purple-200 text-base mb-8">
            Tire suas dúvidas, leia o manual ou fale com nosso suporte.
          </p>

          {/* Busca */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar pergunta... (ex: como agendar, WhatsApp, senha)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-800 text-sm shadow-lg outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* ── Manual PDF ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 rounded-xl p-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Manual Completo do Usuário</h2>
                <p className="text-xs text-gray-500">18 capítulos · PDF · Versão 1.0</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Abrir Manual (PDF)
              </a>
            </div>
          </div>

          {/* Sumário rápido */}
          <div className="px-6 py-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
              O que você encontra no manual
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                'Primeiro acesso e login',
                'Criando agendamentos',
                'Cadastro de clientes',
                'Serviços e profissionais',
                'Financeiro e cobranças',
                'WhatsApp e automações',
                'Leads e prospecção',
                'Relatórios',
                'FAQ com 30 perguntas',
                'Solução de problemas',
                'Boas práticas',
                'Treinamento em 30 min',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dicas Rápidas ── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">💡</span> Dicas Rápidas
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {QUICK_TIPS.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm"
              >
                <span className="text-purple-500 font-bold text-sm mt-0.5 flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">❓</span> Perguntas Frequentes
          </h2>

          {filteredFaq.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma pergunta encontrada para "{search}"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredFaq.map((cat) => (
                <div key={cat.category}>
                  <p className="text-xs uppercase tracking-wide font-semibold text-purple-500 mb-2">
                    {cat.category}
                  </p>
                  <div className="space-y-2">
                    {cat.items.map((item) => (
                      <FaqItem key={item.q} q={item.q} a={item.a} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Contato / Suporte ── */}
        <section className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white text-center">
          <h2 className="text-lg font-semibold mb-1">Ainda com dúvidas?</h2>
          <p className="text-purple-200 text-sm mb-5">
            Nossa equipe está pronta para ajudar você.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/5534997824990"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white text-purple-700 font-semibold text-sm px-5 py-3 rounded-xl hover:bg-purple-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Suporte
            </a>
            <a
              href="mailto:suporte@zensalon.com.br"
              className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold text-sm px-5 py-3 rounded-xl hover:bg-white/20 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              suporte@zensalon.com.br
            </a>
          </div>
        </section>

        <p className="text-center text-xs text-gray-400 pb-4">
          ZenSalon · Central de Ajuda · v1.0
        </p>
      </div>
    </div>
  );
}
