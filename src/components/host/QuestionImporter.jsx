import { useState, useRef, useCallback } from 'react'
import { parseJson }           from '@/lib/parsers/parseJson'
import { parseExcel }          from '@/lib/parsers/parseExcel'
import { parsePdf }            from '@/lib/parsers/parsePdf'
import { downloadExcelTemplate } from '@/lib/downloadTemplate'

const TABS = [
  { id: 'json',  label: 'JSON',  icon: '{ }',  accept: '.json',             desc: 'Cole ou faça upload de um arquivo .json' },
  { id: 'excel', label: 'Excel', icon: '📊',   accept: '.xlsx,.xls,.csv',   desc: 'Planilha .xlsx, .xls ou .csv' },
  { id: 'pdf',   label: 'PDF',   icon: '📄',   accept: '.pdf',              desc: 'PDF com questões no padrão de texto' },
]

const ALT_COLORS = {
  A: 'text-red-400',
  B: 'text-blue-400',
  C: 'text-yellow-400',
  D: 'text-green-400',
}

/**
 * Componente de importação de questões via JSON, Excel ou PDF.
 *
 * @param {Function} onImport — callback(questoes[]) chamado ao confirmar importação
 * @param {Function} onClose  — fecha o modal/painel
 */
export default function QuestionImporter({ onImport, onClose }) {
  const [tab,       setTab]       = useState('json')
  const [jsonText,  setJsonText]  = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [preview,   setPreview]   = useState(null)   // { questoes, errors }
  const fileInputRef = useRef(null)

  // ------------------------------------------------------------------
  // Processamento do arquivo / texto
  // ------------------------------------------------------------------
  const processJson = useCallback(() => {
    if (!jsonText.trim()) return
    const result = parseJson(jsonText)
    setPreview(result)
  }, [jsonText])

  const processFile = useCallback(async (file) => {
    if (!file) return
    setIsLoading(true)
    setPreview(null)

    try {
      const buffer = await file.arrayBuffer()
      let result

      if (tab === 'excel') {
        result = parseExcel(buffer, file.name)
      } else if (tab === 'pdf') {
        result = await parsePdf(buffer)
      }

      setPreview(result)
    } catch (err) {
      setPreview({ questoes: [], errors: [`Erro inesperado: ${err.message}`] })
    } finally {
      setIsLoading(false)
    }
  }, [tab])

  // ------------------------------------------------------------------
  // Drag & Drop
  // ------------------------------------------------------------------
  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  // ------------------------------------------------------------------
  // Confirmar importação
  // ------------------------------------------------------------------
  function handleImport() {
    if (preview?.questoes?.length) {
      onImport(preview.questoes)
    }
  }

  // ------------------------------------------------------------------
  // Trocar aba — limpa estado
  // ------------------------------------------------------------------
  function handleTabChange(id) {
    setTab(id)
    setPreview(null)
    setJsonText('')
  }

  const currentTab = TABS.find((t) => t.id === tab)

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/60 animate-slide-up">

        {/* Cabeçalho do modal */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-white">Importar Questões</h2>
            <p className="text-white/50 text-sm mt-0.5">
              Importe em lote via JSON, planilha ou PDF
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar importador"
            className="text-white/40 hover:text-white/70 text-2xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Abas de formato */}
        <div className="flex gap-1 p-4 pb-0 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all',
                tab === t.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/10',
              ].join(' ')}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Corpo scrollável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ---- Aba JSON ---- */}
          {tab === 'json' && (
            <div className="space-y-4">
              <FormatGuide format="json" />

              <div className="space-y-2">
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest">
                  Cole o JSON abaixo
                </label>
                <textarea
                  rows={10}
                  placeholder={JSON_PLACEHOLDER}
                  value={jsonText}
                  onChange={(e) => { setJsonText(e.target.value); setPreview(null) }}
                  className="input-field font-mono text-xs resize-none leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={processJson}
                  disabled={!jsonText.trim()}
                  className="btn-primary max-w-xs py-3 text-base"
                >
                  Analisar JSON
                </button>
                <span className="text-white/40 text-sm">ou</span>
                <label className="cursor-pointer text-indigo-300 hover:text-indigo-200 text-sm font-semibold underline underline-offset-4 transition-colors">
                  carregar arquivo .json
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        setJsonText(ev.target.result)
                        setPreview(null)
                      }
                      reader.readAsText(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* ---- Aba Excel / PDF ---- */}
          {(tab === 'excel' || tab === 'pdf') && (
            <div className="space-y-4">
              <FormatGuide format={tab} />

              {/* Botão de template — apenas para Excel */}
              {tab === 'excel' && (
                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200 font-semibold underline underline-offset-4 transition-colors"
                >
                  ⬇ Baixar planilha modelo (.xlsx)
                </button>
              )}

              {/* Zona de drag & drop */}
              <div
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true)  }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                onDragOver={(e) =>  { e.preventDefault() }}
                onDrop={handleDrop}
                className={[
                  'relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer',
                  isDragging
                    ? 'border-indigo-400 bg-indigo-500/20 scale-[1.01]'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/5',
                ].join(' ')}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                aria-label={`Carregar arquivo ${currentTab.label}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={currentTab.accept}
                  className="hidden"
                  onChange={handleFileChange}
                />

                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 text-white/60">
                    <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span className="font-semibold">Processando {currentTab.label}…</span>
                  </div>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <div className="text-5xl">{currentTab.icon}</div>
                    <p className="text-white/70 font-semibold">
                      Arraste o arquivo aqui ou clique para selecionar
                    </p>
                    <p className="text-white/40 text-sm">{currentTab.desc}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---- Preview / Erros ---- */}
          {preview && (
            <PreviewPanel preview={preview} />
          )}
        </div>

        {/* Rodapé com botão de importar */}
        <div className="p-6 border-t border-white/10 shrink-0 flex items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            {preview?.questoes?.length
              ? `${preview.questoes.length} questão(ões) pronta(s) para importar`
              : 'Nenhuma questão analisada ainda'}
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!preview?.questoes?.length}
              className="btn-primary max-w-xs py-3 text-sm px-8"
            >
              ✓ Importar {preview?.questoes?.length || ''} questão(ões)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Sub-componente: painel de preview / erros
// ------------------------------------------------------------------
function PreviewPanel({ preview }) {
  const { questoes, errors } = preview

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Erros */}
      {errors.length > 0 && (
        <div className="bg-red-500/15 border border-red-400/30 rounded-2xl p-4 space-y-1.5">
          <p className="text-red-300 text-sm font-bold">
            ⚠ {errors.length} problema(s) encontrado(s)
          </p>
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-red-300/80 text-xs font-mono">• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Questões válidas */}
      {questoes.length > 0 && (
        <div className="space-y-3">
          <p className="text-green-400 text-sm font-bold">
            ✓ {questoes.length} questão(ões) válida(s)
          </p>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {questoes.map((q, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-white font-semibold text-sm">
                  <span className="text-white/40 mr-2">#{i + 1}</span>
                  {q.pergunta}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['A','B','C','D'].map((letra) => (
                    <span
                      key={letra}
                      className={[
                        'text-xs px-2 py-1 rounded-lg',
                        q.correta === letra
                          ? 'bg-green-500/20 border border-green-400/40 text-green-300 font-bold'
                          : 'bg-white/5 text-white/60',
                        ALT_COLORS[letra],
                      ].join(' ')}
                    >
                      {letra}) {q[`alt_${letra.toLowerCase()}`]}
                      {q.correta === letra && ' ✓'}
                    </span>
                  ))}
                </div>
                <p className="text-white/30 text-xs">Tempo: {q.tempo_limite}s</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Sub-componente: guia de formato
// ------------------------------------------------------------------
function FormatGuide({ format }) {
  const [open, setOpen] = useState(false)

  const guides = {
    json: {
      title: 'Formato JSON esperado',
      content: JSON_PLACEHOLDER,
      lang: 'json',
    },
    excel: {
      title: 'Colunas da planilha',
      content: 'pergunta | alt_a | alt_b | alt_c | alt_d | correta | tempo_limite\n"Qual é a capital do Brasil?" | "São Paulo" | "Rio de Janeiro" | "Brasília" | "Salvador" | C | 30',
      lang: 'csv',
    },
    pdf: {
      title: 'Padrão de texto no PDF',
      content: PDF_EXAMPLE,
      lang: 'text',
    },
  }

  const guide = guides[format]

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-white/50 hover:text-white/70 text-sm font-semibold transition-colors"
      >
        <span>📋 {guide.title}</span>
        <span className="text-xs">{open ? '▲ ocultar' : '▼ ver exemplo'}</span>
      </button>

      {open && (
        <pre className="px-4 pb-4 text-xs font-mono text-green-300/80 bg-black/30 whitespace-pre-wrap leading-relaxed">
          {guide.content}
        </pre>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Constantes de exemplo
// ------------------------------------------------------------------
const JSON_PLACEHOLDER = `[
  {
    "pergunta": "Qual é a capital do Brasil?",
    "alt_a": "São Paulo",
    "alt_b": "Rio de Janeiro",
    "alt_c": "Brasília",
    "alt_d": "Salvador",
    "correta": "C",
    "tempo_limite": 30,
    "imagem_url": "https://exemplo.com/mapa.jpg"
  },
  {
    "pergunta": "Quanto é 2 + 2?",
    "a": "3",
    "b": "4",
    "c": "5",
    "d": "6",
    "correta": "B",
    "tempo": 15,
    "imagem_url": ""
  }
]`

const PDF_EXAMPLE = `1. Qual é a capital do Brasil?
A) São Paulo
B) Rio de Janeiro
C) Brasília
D) Salvador
Correta: C
Tempo: 30
Imagem: https://exemplo.com/mapa.jpg

2. Quanto é 2 + 2?
A) 3
B) 4
C) 5
D) 6
Correta: B`
