import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QuestionImage from '@/components/QuestionImage'
import AvatarDisplay from '@/components/AvatarDisplay'

const ALT_CONFIG = {
  A: { bg: 'bg-red-500/20    border-red-400/50',    dot: 'bg-red-400',    icon: '▲' },
  B: { bg: 'bg-blue-500/20   border-blue-400/50',   dot: 'bg-blue-400',   icon: '◆' },
  C: { bg: 'bg-yellow-500/20 border-yellow-400/50', dot: 'bg-yellow-400', icon: '●' },
  D: { bg: 'bg-green-500/20  border-green-400/50',  dot: 'bg-green-400',  icon: '■' },
}

const POLL_MS       = 2500
const REVEALED_SECS = 4   // segundos mostrando o gabarito
const RANKING_SECS  = 6   // segundos mostrando o ranking
const MEDALS        = ['🥇', '🥈', '🥉']

const PODER_EMOJIS = {
  eliminar2:  '🔪',
  mais_tempo: '⏳',
  dobrar_pts: '💰',
  escudo:     '🛡️',
}

export default function HostGameScreen({ jogo, onEnd, onSignOut }) {
  const [questoes,       setQuestoes]       = useState([])
  const [currentIndex,   setCurrentIndex]   = useState(0)
  const [phase,          setPhase]          = useState('idle')   // idle|playing|revealed|ranking|podium
  const [timeLeft,       setTimeLeft]       = useState(0)
  const [timeFraction,   setTimeFraction]   = useState(1)
  const [respostas,      setRespostas]      = useState([])
  const [totalJogadores, setTotalJogadores] = useState(0)
  const [rankingData,    setRankingData]    = useState([])
  const [isLoading,      setIsLoading]      = useState(true)
  const [autoAvancar,    setAutoAvancar]    = useState(true)
  const [countdown,      setCountdown]      = useState(0)

  const timerRef           = useRef(null)
  const pollRef            = useRef(null)
  const autoTimerRef       = useRef(null)
  const phaseTransitionRef = useRef(null)  // sempre aponta para a transição correta

  // ── Carrega dados iniciais ─────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [{ data: qs }, { count }] = await Promise.all([
        supabase.from('questoes').select('*').eq('jogo_id', jogo.id).order('ordem'),
        supabase.from('jogadores').select('*', { count: 'exact', head: true }).eq('jogo_id', jogo.id),
      ])
      setQuestoes(qs ?? [])
      setTotalJogadores(count ?? 0)
      setIsLoading(false)
    }
    init()
  }, [jogo.id])

  const questaoAtual = questoes[currentIndex]
  const isLastQ      = currentIndex >= questoes.length - 1
  const responderam  = respostas.length

  // ── Polling de respostas ───────────────────────────────────────
  const fetchRespostas = useCallback(async () => {
    if (!questaoAtual) return
    const { data } = await supabase
      .from('respostas')
      .select('resposta, correta, pontos, jogador_id')
      .eq('questao_id', questaoAtual.id)
    setRespostas(data ?? [])
  }, [questaoAtual])

  useEffect(() => {
    if (phase === 'playing' || phase === 'revealed') {
      fetchRespostas()
      pollRef.current = setInterval(fetchRespostas, POLL_MS)
    }
    return () => clearInterval(pollRef.current)
  }, [phase, fetchRespostas])

  // ── Auto-revelar quando todos responderam ──────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    if (totalJogadores > 0 && responderam >= totalJogadores) {
      clearInterval(timerRef.current)
      setPhase('revealed')
    }
  }, [responderam, totalJogadores, phase])

  // ── Busca ranking ──────────────────────────────────────────────
  async function fetchRanking() {
    const { data } = await supabase
      .from('jogadores')
      .select('id, nome, avatar, pontuacao, poder_ativo')
      .eq('jogo_id', jogo.id)
      .order('pontuacao', { ascending: false })
    setRankingData(data ?? [])
  }

  // ── Transições de fase ─────────────────────────────────────────
  function goToRanking() {
    clearInterval(timerRef.current)
    fetchRanking()
    setPhase('ranking')
  }

  async function goToNextOrEnd() {
    clearInterval(timerRef.current)
    clearInterval(pollRef.current)
    clearInterval(autoTimerRef.current)
    setCountdown(0)
    if (isLastQ) {
      await supabase.from('jogos').update({ status: 'finalizado' }).eq('id', jogo.id)
      await fetchRanking()
      setPhase('podium')
    } else {
      startQuestion(currentIndex + 1)
    }
  }

  // Ref sempre atualizado para o auto-timer usar a versão mais recente
  phaseTransitionRef.current =
    phase === 'revealed' ? goToRanking  :
    phase === 'ranking'  ? goToNextOrEnd : null

  // ── Countdown automático ───────────────────────────────────────
  useEffect(() => {
    clearInterval(autoTimerRef.current)
    if (!autoAvancar) { setCountdown(0); return }
    const secs = phase === 'revealed' ? REVEALED_SECS : phase === 'ranking' ? RANKING_SECS : 0
    if (!secs) { setCountdown(0); return }
    let remaining = secs
    setCountdown(remaining)
    autoTimerRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(autoTimerRef.current)
        phaseTransitionRef.current?.()
      }
    }, 1000)
    return () => clearInterval(autoTimerRef.current)
  }, [phase, autoAvancar])

  // ── Iniciar questão por índice ─────────────────────────────────
  async function startQuestion(index) {
    const q = questoes[index]
    if (!q) return
    setCurrentIndex(index)
    setRespostas([])

    const agora = new Date().toISOString()
    const { error } = await supabase.from('jogos').update({
      questao_atual_id:    q.id,
      questao_iniciada_em: agora,
    }).eq('id', jogo.id)
    if (error) {
      await supabase.from('jogos').update({ questao_atual_id: q.id }).eq('id', jogo.id)
    }

    setPhase('playing')
    setTimeLeft(q.tempo_limite)
    setTimeFraction(1)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1
        setTimeFraction(next / q.tempo_limite)
        if (next <= 0) {
          clearInterval(timerRef.current)
          setPhase('revealed')
          return 0
        }
        return next
      })
    }, 1000)
  }

  useEffect(() => () => {
    clearInterval(timerRef.current)
    clearInterval(pollRef.current)
    clearInterval(autoTimerRef.current)
  }, [])

  // ── Estatísticas ───────────────────────────────────────────────
  const acertaram     = respostas.filter((r) => r.correta).length
  const countPorLetra = ['A','B','C','D'].reduce((acc, l) => {
    acc[l] = respostas.filter((r) => r.resposta === l).length
    return acc
  }, {})

  // ── Render ─────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex items-center justify-center">
      <p className="text-white/50 text-sm">Carregando questões…</p>
    </div>
  )

  if (phase === 'ranking') return (
    <RankingScreen
      rankingData={rankingData}
      questaoNum={currentIndex + 1}
      totalQuestoes={questoes.length}
      countdown={autoAvancar ? countdown : 0}
      autoAvancar={autoAvancar}
      isLast={isLastQ}
      onNext={goToNextOrEnd}
    />
  )

  if (phase === 'podium') return (
    <PodiumScreen rankingData={rankingData} jogo={jogo} onEnd={onEnd} />
  )

  const timerColor =
    timeFraction > 0.5  ? 'bg-green-400'  :
    timeFraction > 0.25 ? 'bg-yellow-400' : 'bg-red-400'

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col">

      <div className="h-2 w-full bg-white/10">
        <div className={`h-full transition-all duration-1000 ${timerColor}`}
          style={{ width: `${timeFraction * 100}%` }} />
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold truncate max-w-[200px]">{jogo.titulo}</span>
          <span className="bg-white/10 text-white/50 text-xs font-mono px-2 py-1 rounded-lg">{jogo.pin_sala}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/40">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <div onClick={() => setAutoAvancar(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${autoAvancar ? 'bg-purple-500' : 'bg-white/20'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${autoAvancar ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span>Auto</span>
          </label>
          <span>Q {currentIndex + 1}/{questoes.length}</span>
          <span>{totalJogadores} jogadores</span>
          <button onClick={onSignOut} className="hover:text-red-400 transition-colors">Sair</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5 max-w-3xl mx-auto w-full">

        <div className="glass-card w-full p-6 text-center space-y-2">
          <span className="text-white/40 text-xs font-semibold uppercase tracking-widest">
            Questão {currentIndex + 1} · {questaoAtual?.tempo_limite}s
          </span>
          <QuestionImage imagemUrl={questaoAtual?.imagem_url} seed={currentIndex} className="my-1" />
          <p className="text-2xl sm:text-3xl font-black text-white leading-snug">
            {questaoAtual?.pergunta}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          {['A','B','C','D'].map((letra) => {
            const cfg       = ALT_CONFIG[letra]
            const isCorreta = questaoAtual?.correta === letra
            const count     = countPorLetra[letra] ?? 0
            const pct       = responderam > 0 ? Math.round((count / responderam) * 100) : 0
            return (
              <div key={letra} className={`
                relative overflow-hidden border-2 rounded-2xl p-4 transition-all duration-300 ${cfg.bg}
                ${phase === 'revealed' && isCorreta ? 'border-white/80 ring-2 ring-white/40 scale-[1.02]' : ''}
              `}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-sm ${cfg.dot}`} />
                  <span className="text-white font-extrabold">{letra}</span>
                  {phase === 'revealed' && isCorreta &&
                    <span className="ml-auto text-green-400 font-bold text-sm">✓ Correta</span>}
                  {phase !== 'idle' &&
                    <span className="ml-auto text-white/60 text-xs font-mono">{count}</span>}
                </div>
                <p className="text-white/90 text-sm font-semibold">{questaoAtual?.[`alt_${letra.toLowerCase()}`]}</p>
                {phase === 'revealed' && responderam > 0 && (
                  <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white/50 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {phase === 'revealed' && (
          <div className="glass-card w-full p-4 flex items-center justify-around text-center animate-fade-in">
            <Stat value={responderam}              label="responderam"                     />
            <div className="w-px h-10 bg-white/10" />
            <Stat value={acertaram}                label="acertaram"  color="text-green-400" />
            <div className="w-px h-10 bg-white/10" />
            <Stat value={responderam - acertaram}  label="erraram"    color="text-red-400"   />
          </div>
        )}

        {phase === 'playing' && (
          <p className="text-white/50 text-sm">
            {responderam} / {totalJogadores} responderam · ⏱ {timeLeft}s
          </p>
        )}

        <div className="flex gap-3 w-full">
          {phase === 'idle' && (
            <button onClick={() => startQuestion(0)} className="btn-primary py-4">
              ▶ Iniciar Questão 1
            </button>
          )}
          {phase === 'playing' && (
            <button onClick={() => { clearInterval(timerRef.current); setPhase('revealed') }}
              className="btn-primary py-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 shadow-yellow-500/30">
              👁 Revelar Resposta
            </button>
          )}
          {phase === 'revealed' && (
            <button onClick={goToRanking} className="btn-primary py-4">
              {autoAvancar && countdown > 0 ? `📊 Ver Ranking (${countdown}s)` : '📊 Ver Ranking'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Stat({ value, label, color = 'text-white' }) {
  return (
    <div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="text-white/40 text-xs">{label}</p>
    </div>
  )
}

function RankingScreen({ rankingData, questaoNum, totalQuestoes, countdown, autoAvancar, isLast, onNext }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-6 gap-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-black text-white">📊 Placar</h2>
        <p className="text-white/40 text-sm mt-1">Após questão {questaoNum} de {totalQuestoes}</p>
      </div>

      <div className="w-full max-w-md space-y-2">
        {rankingData.slice(0, 8).map((j, i) => (
          <div key={j.id} className={`
            flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
            ${i === 0 ? 'bg-yellow-500/20 border-yellow-400/40' :
              i === 1 ? 'bg-slate-400/15 border-slate-400/30'   :
              i === 2 ? 'bg-orange-500/15 border-orange-400/30' :
              'bg-white/5 border-white/10'}
          `}>
            <span className="text-xl w-8 text-center shrink-0">
              {i < 3 ? MEDALS[i] : <span className="text-white/30 text-sm">#{i + 1}</span>}
            </span>
            <AvatarDisplay avatar={j.avatar} size="2xl" className="shrink-0" />
            <span className="text-white font-bold flex-1 truncate">
              {j.nome}
              {j.poder_ativo && PODER_EMOJIS[j.poder_ativo] && (
                <span className="ml-1.5 font-normal">{PODER_EMOJIS[j.poder_ativo]}🔥</span>
              )}
            </span>
            <span className="text-yellow-300 font-black text-lg shrink-0">{j.pontuacao}</span>
          </div>
        ))}
        {rankingData.length === 0 && (
          <p className="text-white/30 text-center py-4">Nenhum jogador ainda</p>
        )}
      </div>

      <button onClick={onNext} className="btn-primary py-4 max-w-md w-full">
        {isLast
          ? '🏆 Ver Pódio'
          : autoAvancar && countdown > 0
          ? `▶ Próxima Questão (${countdown}s)`
          : '▶ Próxima Questão'}
      </button>
    </div>
  )
}

function PodiumScreen({ rankingData, jogo, onEnd }) {
  const podiumSlots = [rankingData[1], rankingData[0], rankingData[2]]
  // heights: 2nd=left(médio), 1st=center(alto), 3rd=right(baixo)
  const podiumH = ['h-16', 'h-24', 'h-12']
  const podiumBg = [
    'bg-slate-400/30  border-t-2 border-slate-400',
    'bg-yellow-500/40 border-t-2 border-yellow-400',
    'bg-orange-500/30 border-t-2 border-orange-400',
  ]
  const rankForSlot = [1, 0, 2] // medal index for each slot

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-6 gap-8 animate-fade-in">
      <div className="text-center space-y-1">
        <p className="text-white/40 text-sm uppercase tracking-widest">{jogo.titulo}</p>
        <h2 className="text-4xl font-black text-white">🏆 Pódio Final</h2>
      </div>

      {/* Pódio */}
      <div className="flex items-end gap-3 justify-center animate-slide-up">
        {podiumSlots.map((player, slot) => {
          if (!player) return <div key={slot} className="w-24" />
          return (
            <div key={player.id} className="flex flex-col items-center gap-1">
              <AvatarDisplay avatar={player.avatar} size="4xl" />
              <p className="text-white font-bold text-sm text-center w-24 truncate px-1">{player.nome}</p>
              <p className="text-yellow-300 font-black text-sm">{player.pontuacao} pts</p>
              <div className={`${podiumH[slot]} ${podiumBg[slot]} w-24 rounded-t-xl flex items-start justify-center pt-2 text-2xl font-black`}>
                {MEDALS[rankForSlot[slot]]}
              </div>
            </div>
          )
        })}
      </div>

      {/* Restante do ranking */}
      {rankingData.length > 3 && (
        <div className="w-full max-w-xs space-y-1.5">
          {rankingData.slice(3).map((j, i) => (
            <div key={j.id} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
              <span className="text-white/30 text-xs w-6 text-center">#{i + 4}</span>
              <AvatarDisplay avatar={j.avatar} size="xl" />
              <span className="text-white/70 font-medium flex-1 text-sm truncate">{j.nome}</span>
              <span className="text-yellow-300 font-bold text-sm">{j.pontuacao}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={onEnd} className="btn-primary py-3 max-w-xs">
        Encerrar Jogo
      </button>
    </div>
  )
}

