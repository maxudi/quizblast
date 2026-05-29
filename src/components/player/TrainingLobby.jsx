import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AvatarDisplay from '@/components/AvatarDisplay'

const POLL_MS = 2000

/**
 * Sala de espera do modo treino.
 * O gerente (primeiro jogador a entrar) pode iniciar quando quiser.
 *
 * @param {object}   jogador    — dados do jogador atual
 * @param {object}   jogo       — sessão de treino (tipo='treino', parent_quiz_id=...)
 * @param {boolean}  isManager  — se este jogador pode iniciar e avançar questões
 * @param {Function} onStart    — chamado quando o treino inicia
 * @param {Function} onBack     — sair do treino
 */
export default function TrainingLobby({ jogador, jogo, isManager, onStart, onBack }) {
  const [jogadores,  setJogadores]  = useState([])
  const [isStarting, setIsStarting] = useState(false)
  const [error,      setError]      = useState(null)
  const [copied,     setCopied]     = useState(false)
  const pollRef    = useRef(null)
  const timeoutRef  = useRef(null)
  const startedRef  = useRef(false)

  const trainingLink = `${window.location.origin}${window.location.pathname}?t=${jogo.parent_quiz_id}`

  const fetchData = useCallback(async () => {
    const [{ data: players }, { data: jogoData }] = await Promise.all([
      supabase
        .from('jogadores')
        .select('id, nome, avatar, entrou_em')
        .eq('jogo_id', jogo.id)
        .order('entrou_em', { ascending: true }),
      supabase
        .from('jogos')
        .select('status')
        .eq('id', jogo.id)
        .single(),
    ])
    setJogadores(players ?? [])
    if (jogoData?.status === 'em_andamento') {
      startedRef.current = true
      clearTimeout(timeoutRef.current)
      clearInterval(pollRef.current)
      onStart?.()
    }
  }, [jogo.id, onStart])

  useEffect(() => {
    fetchData()
    pollRef.current = setInterval(fetchData, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [fetchData])

  // Auto-expira a sessão 5 min após criação se não iniciada
  useEffect(() => {
    timeoutRef.current = setTimeout(async () => {
      if (startedRef.current) return
      clearInterval(pollRef.current)
      await supabase
        .from('jogos')
        .update({ status: 'finalizado' })
        .eq('id', jogo.id)
        .eq('tipo', 'treino')
      onBack?.()
    }, 5 * 60 * 1000)
    return () => clearTimeout(timeoutRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    setError(null)
    setIsStarting(true)

    const { data: questoes, error: qErr } = await supabase
      .from('questoes')
      .select('id, ordem')
      .eq('jogo_id', jogo.parent_quiz_id)
      .order('ordem')

    if (qErr || !questoes?.length) {
      setError('Não foi possível carregar as questões. Verifique se o quiz tem questões cadastradas.')
      setIsStarting(false)
      return
    }

    const { error: err } = await supabase
      .from('jogos')
      .update({
        status:              'em_andamento',
        questao_atual_id:    questoes[0].id,
        questao_iniciada_em: new Date().toISOString(),
      })
      .eq('id', jogo.id)

    if (err) {
      setError('Erro ao iniciar: ' + err.message)
      setIsStarting(false)
      return
    }

    clearInterval(pollRef.current)
    onStart?.()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(trainingLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Link de treino:\n' + trainingLink)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl space-y-5 animate-fade-in">

        {/* Cabeçalho */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/40 rounded-full px-4 py-1.5 text-indigo-300 text-sm font-semibold">
            🏋️ Sala de Treino
          </div>
          <h1 className="text-2xl font-black text-white">{jogo.titulo}</h1>
        </div>

        {/* Avatar + status do jogador */}
        <div className="glass-card p-6 text-center space-y-3">
          <AvatarDisplay avatar={jogador.avatar} size="8xl" />
          <p className="text-2xl font-bold text-white">
            Olá, <span className="text-yellow-300">{jogador.nome}</span>!
          </p>
          {isManager ? (
            <div className="space-y-1">
              <p className="text-indigo-300 font-semibold text-sm">Você é o primeiro da sala 🎮</p>
              <p className="text-white/50 text-xs">Inicie quando quiser — sozinho ou com mais jogadores</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-white/50 text-sm">Aguardando o primeiro jogador iniciar o treino…</p>
              <div className="flex justify-center gap-2" aria-hidden="true">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Link de convite */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-white/50 text-xs uppercase tracking-widest text-center">Convide mais pessoas</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={trainingLink}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white/70 text-sm font-mono truncate outline-none"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 bg-indigo-500/30 hover:bg-indigo-500/50 border border-indigo-400/40 text-indigo-300 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95"
            >
              {copied ? '✓ Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Lista de jogadores */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold">Na sala</h2>
            <span className="bg-purple-500/40 border border-purple-400/40 text-purple-200 text-sm font-bold px-3 py-1 rounded-full">
              {jogadores.length}
            </span>
          </div>
          {jogadores.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-2">Ninguém ainda…</p>
          ) : (
            <ul className="flex flex-wrap gap-3">
              {jogadores.map((j, i) => (
                <li key={j.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                  j.id === jogador.id ? 'bg-purple-500/20 border-purple-400/40' : 'bg-white/5 border-white/10'
                }`}>
                  {i === 0 && <span className="text-xs" title="Pode iniciar">👑</span>}
                  <AvatarDisplay avatar={j.avatar} size="2xl" />
                  <span className={`font-semibold text-sm ${j.id === jogador.id ? 'text-white' : 'text-white/70'}`}>
                    {j.nome}{j.id === jogador.id ? ' (você)' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div role="alert" className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm flex gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* Botão iniciar (só para o gerente) */}
        {isManager && (
          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-black text-xl rounded-2xl py-4 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-60"
          >
            {isStarting
              ? 'Iniciando…'
              : jogadores.length > 1
                ? `🚀 Iniciar Treino (${jogadores.length} jogadores)`
                : '🚀 Iniciar Treino Sozinho'}
          </button>
        )}

        <button type="button" onClick={onBack} className="w-full text-white/30 hover:text-white/60 text-sm transition-colors py-2">
          ← Sair do treino
        </button>
      </div>
    </div>
  )
}
