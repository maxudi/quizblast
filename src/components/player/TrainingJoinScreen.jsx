import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AvatarBuilder from '@/components/AvatarBuilder'

/**
 * Tela de entrada no modo treino.
 * Acessada via link ?t=QUIZ_ID — jogador informa nome e avatar.
 *
 * @param {string}   quizId  — ID do quiz original
 * @param {Function} onJoin  — callback(jogador, jogoTreino, isManager)
 * @param {Function} onBack  — voltar ao início
 */
export default function TrainingJoinScreen({ quizId, onJoin, onBack }) {
  const [quiz,          setQuiz]          = useState(null)
  const [nome,          setNome]          = useState('')
  const [avatar,        setAvatar]        = useState(JSON.stringify({ e: '🚀', c: 'violet', a: '' }))
  const [isLoading,     setIsLoading]     = useState(false)
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(true)
  const [error,         setError]         = useState(null)

  useEffect(() => {
    supabase
      .from('jogos')
      .select('id, titulo')
      .eq('id', quizId)
      .eq('tipo', 'normal')
      .maybeSingle()
      .then(({ data }) => { setQuiz(data); setIsLoadingQuiz(false) })
  }, [quizId])

  function validate() {
    if (nome.trim().length < 2)  return 'Seu nome precisa ter pelo menos 2 caracteres.'
    if (nome.trim().length > 30) return 'Seu nome pode ter no máximo 30 caracteres.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const err = validate()
    if (err) { setError(err); return }
    setIsLoading(true)

    try {
      // 1. Busca ou cria sessão de treino ativa para este quiz
      // Usa limit(1) ordenado por criado_em para evitar problemas com múltiplas sessões
      const { data: sessions } = await supabase
        .from('jogos')
        .select('*')
        .eq('parent_quiz_id', quizId)
        .eq('tipo', 'treino')
        .eq('status', 'aguardando')
        .order('criado_em', { ascending: true })
        .limit(1)

      let jogoTreino = sessions?.[0] ?? null
      let isManager  = false

      if (!jogoTreino) {
        // Nenhuma sessão ativa → cria uma nova; este jogador é o gerente
        const pin = 'T' + Math.random().toString(36).substring(2, 7).toUpperCase()
        const { data: created, error: createErr } = await supabase
          .from('jogos')
          .insert({
            titulo:         quiz.titulo + ' — Treino',
            pin_sala:       pin,
            status:         'aguardando',
            tipo:           'treino',
            parent_quiz_id: quizId,
          })
          .select()
          .single()
        if (createErr) throw createErr
        jogoTreino = created
        isManager  = true  // quem cria é o gerente
      }

      // 2. Verifica se nome já está em uso nesta sessão
      const { data: nomeEmUso } = await supabase
        .from('jogadores')
        .select('id')
        .eq('jogo_id', jogoTreino.id)
        .ilike('nome', nome.trim())
        .maybeSingle()

      if (nomeEmUso) {
        setError('Este nome já está sendo usado nesta sala. Escolha outro.')
        setIsLoading(false)
        return
      }

      // 3. Insere jogador
      const { data: jogador, error: insertErr } = await supabase
        .from('jogadores')
        .insert({ jogo_id: jogoTreino.id, nome: nome.trim(), avatar })
        .select()
        .single()
      if (insertErr) throw insertErr

      onJoin(jogador, jogoTreino, isManager)
    } catch (e) {
      setError('Erro ao entrar no treino: ' + e.message)
      setIsLoading(false)
    }
  }

  if (isLoadingQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex items-center justify-center">
        <Dots />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4 gap-5">
        <p className="text-6xl">🔍</p>
        <p className="text-white font-bold text-xl">Quiz não encontrado</p>
        <p className="text-white/50 text-sm text-center">
          O link de treino pode estar incorreto ou o quiz foi removido.
        </p>
        <button type="button" onClick={onBack} className="btn-primary max-w-xs py-3">
          Voltar ao início
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/40 rounded-full px-4 py-1.5 text-indigo-300 text-sm font-semibold">
            🏋️ Modo Treino
          </div>
          <h1 className="text-3xl font-black text-white">{quiz.titulo}</h1>
          <p className="text-white/50 text-sm">Entre com seu nome e avatar para treinar</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-white/70 text-sm font-semibold block">Seu nome</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Como quer ser chamado?"
              maxLength={30}
              className="input-field"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-white/70 text-sm font-semibold block">Seu avatar</label>
            <AvatarBuilder value={avatar} onChange={setAvatar} />
          </div>

          {error && (
            <div role="alert" className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm flex items-start gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 disabled:opacity-60">
            {isLoading ? 'Entrando…' : '🏋️ Entrar no Treino'}
          </button>
        </form>

        <button type="button" onClick={onBack} className="w-full text-white/30 hover:text-white/60 text-sm transition-colors py-2">
          ← Voltar ao início
        </button>
      </div>
    </div>
  )
}

function Dots() {
  return (
    <div className="flex justify-center gap-2" aria-hidden="true">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}
