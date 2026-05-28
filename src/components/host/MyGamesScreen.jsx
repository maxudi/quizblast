import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const STATUS_CONFIG = {
  aguardando:   { label: 'Aguardando',  color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' },
  em_andamento: { label: 'Em andamento',color: 'bg-green-500/20  text-green-300  border-green-400/30'  },
  finalizado:   { label: 'Finalizado',  color: 'bg-white/10      text-white/40   border-white/10'       },
}

/**
 * Tela de listagem dos quizzes criados pelo professor.
 *
 * @param {object}   user       — usuário autenticado
 * @param {Function} onCreate   — ir para tela de criação de novo quiz
 * @param {Function} onResume   — callback(jogo) para retomar um jogo existente
 * @param {Function} onBack     — voltar ao início
 * @param {Function} onSignOut  — deslogar
 */
export default function MyGamesScreen({ user, onCreate, onResume, onBack, onSignOut }) {
  const [jogos, setJogos]       = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState(null)
  const [deleting,    setDeleting]    = useState(null) // id do jogo sendo deletado
  const [restarting,  setRestarting]  = useState(null) // id do jogo sendo reiniciado

  useEffect(() => {
    fetchJogos()
  }, [])

  async function fetchJogos() {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('jogos')
      .select(`
        id, titulo, pin_sala, status, criado_em,
        questoes!questoes_jogo_id_fkey ( id )
      `)
      .eq('host_id', user.id)
      .order('criado_em', { ascending: false })

    if (err) {
      setError('Erro ao carregar os quizzes: ' + err.message)
    } else {
      setJogos(data ?? [])
    }

    setIsLoading(false)
  }

  async function handleRestart(jogo) {
    if (!window.confirm(`Reiniciar "${jogo.titulo}"? Isso apagará todas as respostas e pontuações desta rodada.`)) return

    setRestarting(jogo.id)

    // Apaga respostas e jogadores da rodada anterior
    await supabase.from('respostas').delete().eq('jogo_id', jogo.id)
    await supabase.from('jogadores').delete().eq('jogo_id', jogo.id)

    // Reseta o jogo para aguardando
    const { error: err } = await supabase
      .from('jogos')
      .update({ status: 'aguardando', questao_atual_id: null, questao_iniciada_em: null })
      .eq('id', jogo.id)

    if (err) {
      alert('Erro ao reiniciar: ' + err.message)
    } else {
      setJogos((prev) => prev.map((j) => j.id === jogo.id ? { ...j, status: 'aguardando' } : j))
    }

    setRestarting(null)
  }

  async function handleDelete(jogo) {
    if (!window.confirm(`Apagar o quiz "${jogo.titulo}"? Esta ação não pode ser desfeita.`)) return

    setDeleting(jogo.id)

    const { error: err } = await supabase
      .from('jogos')
      .delete()
      .eq('id', jogo.id)

    if (err) {
      alert('Erro ao apagar: ' + err.message)
    } else {
      setJogos((prev) => prev.filter((j) => j.id !== jogo.id))
    }

    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-4 pb-16">

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto space-y-6 animate-slide-up">

        {/* Barra superior */}
        <div className="flex items-center justify-between pt-4">
          <button type="button" onClick={onBack}
            className="text-white/40 hover:text-white/70 text-sm transition-colors">
            ← Início
          </button>
          <div className="text-white/40 text-sm flex items-center gap-3">
            <span className="truncate max-w-[160px]">{user?.email}</span>
            <button type="button" onClick={onSignOut}
              className="hover:text-red-400 underline underline-offset-4 transition-colors">
              Sair
            </button>
          </div>
        </div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Meus Quizzes</h1>
            <p className="text-white/50 text-sm mt-1">
              {isLoading ? 'Carregando…' : `${jogos.length} quiz(zes) criado(s)`}
            </p>
          </div>

          <button
            type="button"
            onClick={onCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold rounded-2xl px-6 py-3 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
          >
            + Novo Quiz
          </button>
        </div>

        {/* Estado de carregamento */}
        {isLoading && (
          <div className="glass-card p-12 text-center space-y-3">
            <div className="flex justify-center gap-2">
              {[0,1,2].map((i) => (
                <div key={i} className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-white/40 text-sm">Buscando seus quizzes…</p>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div role="alert"
            className="bg-red-500/20 border border-red-400/40 rounded-2xl px-4 py-3 text-red-300 text-sm flex items-start gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* Lista vazia */}
        {!isLoading && !error && jogos.length === 0 && (
          <div className="glass-card p-16 text-center space-y-4">
            <div className="text-6xl">📝</div>
            <h2 className="text-xl font-bold text-white">Nenhum quiz criado ainda</h2>
            <p className="text-white/50 text-sm">Crie seu primeiro quiz e compartilhe com os alunos!</p>
            <button
              type="button"
              onClick={onCreate}
              className="btn-primary max-w-xs mx-auto py-3"
            >
              Criar meu primeiro quiz
            </button>
          </div>
        )}

        {/* Lista de jogos */}
        {!isLoading && jogos.length > 0 && (
          <ul className="space-y-3">
            {jogos.map((jogo) => {
              const cfg          = STATUS_CONFIG[jogo.status] ?? STATUS_CONFIG.aguardando
              const numQuestoes  = jogo.questoes?.length ?? 0
              const podeRetomar  = jogo.status === 'aguardando' || jogo.status === 'em_andamento'
              const isFinalizado = jogo.status === 'finalizado'
              const isDeleting   = deleting === jogo.id
              const isRestarting = restarting === jogo.id

              return (
                <li key={jogo.id}
                  className="glass-card p-5 flex items-center gap-4 hover:bg-white/15 transition-all duration-150">

                  {/* Ícone de status */}
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
                    {jogo.status === 'aguardando'   && '⏳'}
                    {jogo.status === 'em_andamento' && '▶️'}
                    {jogo.status === 'finalizado'   && '✅'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold truncate">{jogo.titulo}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-yellow-300 font-mono font-bold text-sm tracking-widest">
                        {jogo.pin_sala}
                      </span>
                      <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-white/40 text-xs">
                        {numQuestoes} questão(ões)
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    {podeRetomar && (
                      <button
                        type="button"
                        onClick={() => onResume(jogo)}
                        className="bg-green-500/20 hover:bg-green-500/40 border border-green-400/40 text-green-300 hover:text-green-200 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95"
                      >
                        {jogo.status === 'em_andamento' ? '▶ Retomar' : '🚀 Abrir Lobby'}
                      </button>
                    )}

                    {isFinalizado && (
                      <button
                        type="button"
                        onClick={() => handleRestart(jogo)}
                        disabled={isRestarting}
                        className="bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-400/40 text-indigo-300 hover:text-indigo-200 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isRestarting ? '…' : '🔄 Reiniciar'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(jogo)}
                      disabled={isDeleting}
                      aria-label={`Apagar quiz ${jogo.titulo}`}
                      className="text-white/25 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {isDeleting ? '…' : '🗑'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
