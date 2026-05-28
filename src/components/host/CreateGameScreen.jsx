import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { generatePin } from '@/lib/generatePin'
import QuestionForm from '@/components/host/QuestionForm'
import QuestionImporter from '@/components/host/QuestionImporter'

// Fábrica de questão vazia
function newQuestao() {
  return {
    pergunta:    '',
    alt_a:       '',
    alt_b:       '',
    alt_c:       '',
    alt_d:       '',
    correta:     'A',
    tempo_limite: 30,
  }
}

/**
 * Tela de criação de jogo para o professor.
 *
 * @param {Function} onCreated — callback(jogo) após inserção bem-sucedida
 * @param {Function} onBack    — voltar ao início
 * @param {Function} onSignOut — deslogar
 * @param {object}   user      — usuário autenticado do Supabase
 */
export default function CreateGameScreen({ onCreated, onBack, onSignOut, user }) {
  const [titulo, setTitulo]     = useState('')
  const [pin, setPin]           = useState(generatePin)
  const [questoes, setQuestoes]     = useState([newQuestao()])
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState(null)
  const [showImporter, setShowImporter] = useState(false)

  // ----------------------------------------------------------------
  // Manipulação das questões
  // ----------------------------------------------------------------
  const updateQuestao = useCallback((index, field, value) => {
    setQuestoes((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    )
  }, [])

  const addQuestao = useCallback(() => {
    setQuestoes((prev) => [...prev, newQuestao()])
  }, [])

  const removeQuestao = useCallback((index) => {
    setQuestoes((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Recebe questões do importador e mescla com as existentes
  const handleImport = useCallback((importadas) => {
    setQuestoes((prev) => {
      // Remove a questão vazia inicial se for a única e estiver vazia
      const semVazias = prev.filter(
        (q) => q.pergunta.trim() || q.alt_a.trim()
      )
      return [...semVazias, ...importadas]
    })
    setShowImporter(false)
  }, [])

  // ----------------------------------------------------------------
  // Validação
  // ----------------------------------------------------------------
  function validate() {
    if (titulo.trim().length < 3) return 'O título precisa ter ao menos 3 caracteres.'

    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i]
      const n = i + 1
      if (!q.pergunta.trim())  return `Questão ${n}: preencha a pergunta.`
      if (!q.alt_a.trim())     return `Questão ${n}: preencha a alternativa A.`
      if (!q.alt_b.trim())     return `Questão ${n}: preencha a alternativa B.`
      if (!q.alt_c.trim())     return `Questão ${n}: preencha a alternativa C.`
      if (!q.alt_d.trim())     return `Questão ${n}: preencha a alternativa D.`
    }
    return null
  }

  // ----------------------------------------------------------------
  // Submissão — insere jogo e questões no Supabase
  // ----------------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setIsLoading(true)

    try {
      // 1. Cria o jogo vinculado ao professor autenticado
      const { data: jogo, error: jogoErr } = await supabase
        .from('jogos')
        .insert({ titulo: titulo.trim(), pin_sala: pin, status: 'aguardando', host_id: user.id })
        .select()
        .single()

      if (jogoErr) {
        // PIN duplicado → gera novo e tenta de novo
        if (jogoErr.code === '23505') {
          setPin(generatePin())
          setError('PIN gerado já estava em uso. Um novo PIN foi gerado — tente novamente.')
          return
        }
        throw jogoErr
      }

      // 2. Insere todas as questões em lote
      const questoesPayload = questoes.map((q, i) => ({
        jogo_id:     jogo.id,
        ordem:       i + 1,
        pergunta:    q.pergunta.trim(),
        alt_a:       q.alt_a.trim(),
        alt_b:       q.alt_b.trim(),
        alt_c:       q.alt_c.trim(),
        alt_d:       q.alt_d.trim(),
        correta:     q.correta,
        tempo_limite: q.tempo_limite,
      }))

      const { error: questoesErr } = await supabase
        .from('questoes')
        .insert(questoesPayload)

      if (questoesErr) throw questoesErr

      onCreated(jogo)
    } catch (err) {
      console.error('[CreateGameScreen]', err)
      setError('Erro ao criar o jogo: ' + (err.message ?? 'tente novamente.'))
    } finally {
      setIsLoading(false)
    }
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-4 pb-16">

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto space-y-8 animate-slide-up">

        {/* Barra superior */}
        <div className="flex items-center justify-between pt-4">
          <button type="button" onClick={onBack} className="text-white/40 hover:text-white/70 text-sm transition-colors">
            ← Início
          </button>
          <div className="text-white/40 text-sm">
            {user?.email}
            <button
              type="button"
              onClick={onSignOut}
              className="ml-3 text-white/40 hover:text-red-400 underline underline-offset-4 text-sm transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Título da página */}
        <header>
          <h1 className="text-3xl font-black text-white">Criar novo Quiz</h1>
          <p className="text-white/50 text-sm mt-1">Preencha as informações e adicione as questões</p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* Configurações gerais */}
          <div className="glass-card p-6 space-y-5">
            <h2 className="text-white font-bold text-lg">Configurações da sala</h2>

            {/* Título */}
            <div className="space-y-2">
              <label htmlFor="titulo" className="block text-white/70 text-xs font-semibold uppercase tracking-widest">
                Título do Quiz
              </label>
              <input
                id="titulo"
                type="text"
                maxLength={100}
                placeholder="Ex: Matemática — Fração e Porcentagem"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={isLoading}
                className="input-field"
              />
            </div>

            {/* PIN */}
            <div className="space-y-2">
              <span className="block text-white/70 text-xs font-semibold uppercase tracking-widest">
                PIN da Sala
              </span>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/10 border border-white/25 rounded-2xl px-5 py-4 text-center">
                  <span className="text-3xl font-black tracking-[0.4em] text-yellow-300">
                    {pin}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPin(generatePin())}
                  disabled={isLoading}
                  className="bg-white/10 hover:bg-white/20 border border-white/25 rounded-2xl px-4 py-4 text-white/70 hover:text-white text-sm font-semibold transition-all duration-150 whitespace-nowrap"
                >
                  🔄 Novo PIN
                </button>
              </div>
              <p className="text-white/40 text-xs">
                Compartilhe este PIN com os alunos para entrarem na sala.
              </p>
            </div>
          </div>

          {/* Questões */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-white font-bold text-lg">
                Questões
                <span className="ml-2 text-white/40 text-sm font-normal">
                  ({questoes.length})
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setShowImporter(true)}
                disabled={isLoading}
                className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 hover:text-indigo-200 rounded-xl px-4 py-2 text-sm font-bold transition-all"
              >
                ⬆ Importar JSON / Excel / PDF
              </button>
            </div>

            {questoes.map((q, i) => (
              <QuestionForm
                key={i}
                index={i}
                questao={q}
                onChange={(field, value) => updateQuestao(i, field, value)}
                onRemove={() => removeQuestao(i)}
                canRemove={questoes.length > 1}
              />
            ))}

            <button
              type="button"
              onClick={addQuestao}
              disabled={isLoading}
              className="w-full glass-card py-4 text-white/60 hover:text-white hover:bg-white/15 border-dashed transition-all duration-150 font-semibold text-sm"
            >
              + Adicionar questão
            </button>
          </div>

          {/* Erro */}
          {error && (
            <div role="alert" className="flex items-start gap-2 bg-red-500/20 border border-red-400/40 rounded-2xl px-4 py-3 text-red-300 text-sm font-medium animate-fade-in">
              <span aria-hidden="true" className="shrink-0">⚠️</span>
              {error}
            </div>
          )}

          {/* Botão criar */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            aria-busy={isLoading}
          >
            {isLoading
              ? <span className="flex items-center justify-center gap-2"><Spinner /> Criando sala...</span>
              : '🚀 Criar Sala e Aguardar Jogadores'}
          </button>

        </form>
      </div>

      {/* Modal de importação */}
      {showImporter && (
        <QuestionImporter
          onImport={handleImport}
          onClose={() => setShowImporter(false)}
        />
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
