import { supabase } from '@/lib/supabaseClient'
import { useRealtimePlayers } from '@/hooks/useRealtimePlayers'
import { useState } from 'react'
import AvatarDisplay from '@/components/AvatarDisplay'

/**
 * Lobby do professor: exibe o PIN, lista de jogadores em tempo real
 * e o botão para iniciar o jogo.
 *
 * @param {object}   jogo      — jogo criado
 * @param {Function} onStart   — callback quando o jogo é iniciado
 * @param {Function} onEnd     — callback para encerrar/voltar ao início
 * @param {Function} onSignOut — deslogar
 */
export default function HostLobby({ jogo, onStart, onEnd, onSignOut }) {
  const { jogadores, isConnected } = useRealtimePlayers(jogo.id)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState(null)

  async function handleStart() {
    if (jogadores.length === 0) {
      setError('Aguarde ao menos um jogador entrar antes de iniciar.')
      return
    }
    setError(null)
    setIsStarting(true)

    const { error: err } = await supabase
      .from('jogos')
      .update({ status: 'em_andamento' })
      .eq('id', jogo.id)

    if (err) {
      setError('Erro ao iniciar o jogo: ' + err.message)
      setIsStarting(false)
      return
    }

    onStart?.({ ...jogo, status: 'em_andamento' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col p-4">

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto w-full space-y-6 animate-fade-in">

        {/* Barra superior */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <span className={[
              'w-2.5 h-2.5 rounded-full',
              isConnected ? 'bg-green-400 animate-pulse-fast' : 'bg-yellow-400',
            ].join(' ')} />
            <span className="text-white/50 text-sm">
              {isConnected ? 'Realtime ativo' : 'Conectando...'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onEnd} className="text-white/40 hover:text-white/70 text-sm transition-colors">
              ← Início
            </button>
            <button type="button" onClick={onSignOut} className="text-white/40 hover:text-red-400 text-sm transition-colors">
              Sair
            </button>
          </div>
        </div>

        {/* Cabeçalho do jogo */}
        <div className="glass-card p-8 text-center space-y-4">
          <h1 className="text-3xl font-black text-white">{jogo.titulo}</h1>
          <p className="text-white/50 text-sm">Compartilhe o PIN abaixo com os alunos</p>

          {/* PIN em destaque */}
          <div className="inline-flex flex-col items-center gap-1 bg-white/10 border border-white/20 rounded-3xl px-12 py-5">
            <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">PIN da Sala</span>
            <span className="text-6xl font-black tracking-[0.3em] text-yellow-300">
              {jogo.pin_sala}
            </span>
          </div>

          <p className="text-white/40 text-sm">
            Acesse <span className="text-white/70 font-semibold">quizblast.app</span> e insira o PIN
          </p>
        </div>

        {/* Jogadores */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">Jogadores na sala</h2>
            <span className="bg-purple-500/40 border border-purple-400/40 text-purple-200 text-sm font-bold px-3 py-1 rounded-full">
              {jogadores.length} {jogadores.length === 1 ? 'jogador' : 'jogadores'}
            </span>
          </div>

          {jogadores.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="flex justify-center gap-2" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-white/40 text-sm">Aguardando jogadores entrarem…</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {jogadores.map((p) => (
                <li key={p.id} className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-2xl px-3 py-2.5">
                  <AvatarDisplay avatar={p.avatar} size="2xl" />
                  <span className="text-white font-semibold text-sm truncate">{p.nome}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div role="alert" className="flex items-start gap-2 bg-red-500/20 border border-red-400/40 rounded-2xl px-4 py-3 text-red-300 text-sm font-medium">
            <span aria-hidden="true" className="shrink-0">⚠️</span>
            {error}
          </div>
        )}

        {/* Botão iniciar */}
        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting || jogadores.length === 0}
          className="btn-primary"
          aria-busy={isStarting}
        >
          {isStarting
            ? <span className="flex items-center justify-center gap-2"><Spinner /> Iniciando...</span>
            : jogadores.length === 0
              ? 'Aguardando jogadores…'
              : `▶ Iniciar Jogo com ${jogadores.length} ${jogadores.length === 1 ? 'jogador' : 'jogadores'}`}
        </button>

      </div>
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
