path = "frontend/src/pages/HelpPage.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1. Remover o estado pdfVisible (nao usaremos mais toggle)
old_state = """export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [pdfVisible, setPdfVisible] = useState(false);

  const PDF_URL = '/manual/Manual_ZenSalon.pdf';"""
new_state = """export default function HelpPage() {
  const [search, setSearch] = useState('');

  const PDF_URL = '/manual/Manual_ZenSalon.pdf';"""
if old_state in content:
    content = content.replace(old_state, new_state)
    changes += 1
    print("OK: estado pdfVisible removido")
else:
    print("AVISO: bloco de estado nao encontrado")

# 2. Trocar os dois botoes por um unico botao "Abrir Manual (PDF)"
old_buttons = """            <div className="flex items-center gap-2">
              <button
                onClick={() => setPdfVisible(!pdfVisible)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200 text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                {pdfVisible ? 'Fechar' : 'Ler online'}
              </button>
              <a
                href={PDF_URL}
                download="Manual_ZenSalon.pdf"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </a>
            </div>"""
new_buttons = """            <div className="flex items-center gap-2">
              <a
                href={PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Abrir Manual (PDF)
              </a>
            </div>"""
if old_buttons in content:
    content = content.replace(old_buttons, new_buttons)
    changes += 1
    print("OK: botoes substituidos por 'Abrir Manual (PDF)'")
else:
    print("AVISO: bloco de botoes nao encontrado")

# 3. Remover condicional do sumario e o iframe do visualizador
old_block = """          {/* Sumário rápido */}
          {!pdfVisible && (
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
          )}

          {/* Visualizador PDF */}
          {pdfVisible && (
            <div className="w-full" style={{ height: '80vh' }}>
              <iframe
                src={`${PDF_URL}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0"
                title="Manual ZenSalon"
              />
            </div>
          )}
        </section>"""
new_block = """          {/* Sumário rápido */}
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
        </section>"""
if old_block in content:
    content = content.replace(old_block, new_block)
    changes += 1
    print("OK: iframe removido, sumario sempre visivel")
else:
    print("AVISO: bloco do sumario/iframe nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/3")
