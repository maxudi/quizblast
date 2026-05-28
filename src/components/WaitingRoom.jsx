import { useState } from 'react'
import { useRealtimePlayers } from '@/hooks/useRealtimePlayers'
import { useGameStatus }      from '@/hooks/useGameStatus'
import AvatarDisplay from '@/components/AvatarDisplay'

/**
 * Sala de espera exibida após o jogador entrar com sucesso.
 *
 * @param {object}   jogador   — dados do jogador atual
 * @param {object}   jogo      — dados do jogo/sala
 * @param {Function} onLeave   — sair da sala
 * @param {Function} onStart   — chamado quando o professor iniciar o jogo
 */
export default function WaitingRoom({ jogador, jogo, onLeave, onStart }) {
  const { jogadores, isConnected, error } = useRealtimePlayers(jogo.id)
  const [jogoIniciando, setJogoIniciando] = useState(false)

  useGameStatus(jogo.id, jogo.status, (novoStatus) => {
    if (novoStatus === 'em_andamento') {
      setJogoIniciando(true)
      // Pequeno delay para mostrar a animação antes de trocar de tela
      setTimeout(() => onStart?.(), 1500)
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4">

      {/* Orbes decorativos */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      {/* Overlay de jogo iniciando */}
      {jogoIniciando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-8xl animate-bounce-slow">🚀</div>
            <h2 className="text-4xl font-black text-white">O jogo começou!</h2>
            <p className="text-white/60">Preparando sua tela…</p>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-2xl space-y-6 animate-fade-in">

        {/* Cabeçalho da sala */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2">
            <span className={[
              'w-2.5 h-2.5 rounded-full',
              isConnected ? 'bg-green-400 animate-pulse-fast' : 'bg-yellow-400',
            ].join(' ')} />
            <span className="text-white/70 text-sm font-semibold">
              {isConnected ? 'Conectado em tempo real' : 'Conectando...'}
            </span>
          </div>

          <h2 className="text-4xl font-black text-white">{jogo.titulo}</h2>

          <div className="flex items-center justify-center gap-3">
            <span className="text-white/50 text-sm">PIN da sala:</span>
            <span className="text-3xl font-black tracking-[0.25em] text-yellow-300">
              {jogo.pin_sala}
            </span>
          </div>
        </div>

        {/* Card de espera */}
        <div className="glass-card p-8 text-center space-y-4">
          <AvatarDisplay avatar={jogador.avatar} size="8xl" />
          <p className="text-2xl font-bold text-white">
            Olá, <span className="text-yellow-300">{jogador.nome}</span>!
          </p>
          <p className="text-white/60 font-medium">
            Aguardando o organizador iniciar o jogo…
          </p>

          {/* Indicador animado */}
          <div className="flex justify-center gap-2 py-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        {/* Lista de jogadores na sala */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">Jogadores na sala</h3>
            <span className="bg-purple-500/40 border border-purple-400/40 text-purple-200 text-sm font-bold px-3 py-1 rounded-full">
              {jogadores.length}
            </span>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">
              Erro ao conectar ao Realtime. Atualize a página.
            </p>
          )}

          {jogadores.length === 0 ? (
            <p className="text-white/40 text-center text-sm py-4">
              Nenhum jogador ainda…
            </p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {jogadores.map((p) => (
                <li
                  key={p.id}
                  className={[
                    'flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2.5',
                    'border transition-all duration-300',
                    p.id === jogador.id
                      ? 'border-yellow-400/60 bg-yellow-400/10'
                      : 'border-white/10',
                  ].join(' ')}
                >
                  <AvatarDisplay avatar={p.avatar} size="2xl" />
                  <span className="text-white font-semibold text-sm truncate">
                    {p.nome}
                    {p.id === jogador.id && (
                      <span className="ml-1 text-yellow-400 text-xs">(você)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Botão sair */}
        <div className="text-center">
          <button
            type="button"
            onClick={onLeave}
            className="text-white/40 hover:text-white/70 text-sm font-medium underline underline-offset-4 transition-colors"
          >
            ← Sair da sala
          </button>
        </div>
      </div>
    </div>
  )
}
