import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QuestionImage from '@/components/QuestionImage'
import AvatarDisplay from '@/components/AvatarDisplay'

const ALT_CONFIG = {
  A: { bg: 'bg-red-500    hover:bg-red-400    active:bg-red-600',    icon: '▲' },
  B: { bg: 'bg-blue-500   hover:bg-blue-400   active:bg-blue-600',   icon: '◆' },
  C: { bg: 'bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600', icon: '●' },
  D: { bg: 'bg-green-500  hover:bg-green-400  active:bg-green-600',  icon: '■' },
}

const MEDALS = ['🥇', '🥈', '🥉']
const POLL_MS = 2000

const POWERS = {
  eliminar2:  { emoji: '🔪', nome: 'Eliminar 2',    desc: 'Remove 2 alternativas erradas' },
  mais_tempo: { emoji: '⏳', nome: '+10 Segundos',  desc: 'Adiciona 10s ao seu tempo'     },
  dobrar_pts: { emoji: '💰', nome: 'Pontos Duplos', desc: 'Esta questão vale 2x'           },
  escudo:     { emoji: '🛡️', nome: 'Escudo',        desc: 'Streak protegida se errar'     },
}

export default function PlayerGameScreen({ jogador, jogo, onEnd }) {
  const [questao,        setQuestao]        = useState(null)
  const [questaoAtualId, setQuestaoAtualId] = useState(null)
  const [phase,          setPhase]          = useState('waiting')  // waiting|answering|answered|ended
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isCorrect,      setIsCorrect]      = useState(null)
  const [pontosGanhos,   setPontosGanhos]   = useState(0)
  const [pontuacaoTotal, setPontuacaoTotal] = useState(jogador.pontuacao ?? 0)
  const [timeLeft,       setTimeLeft]       = useState(0)
  const [timeFraction,   setTimeFraction]   = useState(1)
  const [rankingData,    setRankingData]    = useState([])
  const [streak,         setStreak]         = useState(jogador.streak ?? 0)
  const [poderAtivo,     setPoderAtivo]     = useState(jogador.poder_ativo ?? null)
  const [hiddenAlts,     setHiddenAlts]     = useState(new Set())
  const [poderGanho,     setPoderGanho]     = useState(null)
  const [totalQuestoes,  setTotalQuestoes]  = useState(0)

  const answeredIds   = useRef(new Set())
  const timerRef      = useRef(null)
  const startedAt     = useRef(null)
  const tempoBoostRef = useRef(null)

  // ── Busca ranking (chamado quando answered ou ended) ───────────
  async function fetchRanking() {
    const { data } = await supabase
      .from('jogadores')
      .select('id, nome, avatar, pontuacao')
      .eq('jogo_id', jogo.id)
      .order('pontuacao', { ascending: false })
    setRankingData(data ?? [])
  }

  useEffect(() => {
    if (phase === 'answered' || phase === 'ended') fetchRanking()
  }, [phase]) // eslint-disable-line

  // ── Total de questões (buscado uma vez) ────────────────────────
  useEffect(() => {
    supabase
      .from('questoes')
      .select('*', { count: 'exact', head: true })
      .eq('jogo_id', jogo.id)
      .then(({ count }) => setTotalQuestoes(count ?? 0))
  }, [jogo.id])

  // ── Poder: eliminar2 — oculta 2 alternativas erradas ──────────
  useEffect(() => {
    if (phase === 'answering' && poderAtivo === 'eliminar2' && questao) {
      const wrong = ['A', 'B', 'C', 'D'].filter(l => l !== questao.correta)
      setHiddenAlts(new Set([...wrong].sort(() => Math.random() - 0.5).slice(0, 2)))
    } else {
      setHiddenAlts(new Set())
    }
  }, [questaoAtualId, phase]) // eslint-disable-line

  // ── Poder: mais_tempo — adiciona 10s (uma vez por questão) ────
  useEffect(() => {
    if (
      phase === 'answering' &&
      poderAtivo === 'mais_tempo' &&
      questaoAtualId &&
      tempoBoostRef.current !== questaoAtualId
    ) {
      tempoBoostRef.current = questaoAtualId
      setTimeLeft(t => t + 10)
    }
  }, [phase, questaoAtualId, poderAtivo])

  // ── Polling: detecta mudança de questão e status ───────────────
  const checkJogo = useCallback(async () => {
    const { data } = await supabase
      .from('jogos')
      .select('questao_atual_id, questao_iniciada_em, status')
      .eq('id', jogo.id)
      .single()

    if (!data) return

    if (data.status === 'finalizado') {
      clearInterval(timerRef.current)
      setPhase('ended')
      return
    }

    const newId = data.questao_atual_id
    if (!newId || newId === questaoAtualId) return

    setQuestaoAtualId(newId)

    const { data: q } = await supabase
      .from('questoes').select('*').eq('id', newId).single()
    if (!q) return

    setQuestao(q)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setPontosGanhos(0)

    if (answeredIds.current.has(newId)) {
      setPhase('answered')
      return
    }

    let remaining = q.tempo_limite
    if (data.questao_iniciada_em) {
      const elapsed = (Date.now() - new Date(data.questao_iniciada_em).getTime()) / 1000
      remaining = Math.max(0, Math.round(q.tempo_limite - elapsed))
    }

    setPhase('answering')
    setTimeLeft(remaining)
    setTimeFraction(remaining / q.tempo_limite)
    startedAt.current = data.questao_iniciada_em
      ? new Date(data.questao_iniciada_em).getTime()
      : Date.now()

    clearInterval(timerRef.current)
    const total = q.tempo_limite
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1
        setTimeFraction(next / total)
        if (next <= 0) {
          clearInterval(timerRef.current)
          setPhase('answered')
          answeredIds.current.add(newId)
        }
        return next <= 0 ? 0 : next
      })
    }, 1000)
  }, [questaoAtualId, jogo.id])

  useEffect(() => {
    const interval = setInterval(checkJogo, POLL_MS)
    checkJogo()
    return () => {
      clearInterval(interval)
      clearInterval(timerRef.current)
    }
  }, [checkJogo])

  // ── Responder ──────────────────────────────────────────────────
  async function handleAnswer(letra) {
    if (phase !== 'answering' || selectedAnswer) return
    clearInterval(timerRef.current)

    const tempoMs = startedAt.current ? Date.now() - startedAt.current : 0
    const correta = letra === questao.correta
    let pontos    = correta
      ? Math.round(1000 * Math.max(0.5, 1 - 0.5 * (tempoMs / (questao.tempo_limite * 1000))))
      : 0

    // Poder: dobrar pontos
    if (poderAtivo === 'dobrar_pts' && correta) pontos = Math.min(pontos * 2, 2000)

    setSelectedAnswer(letra)
    setIsCorrect(correta)
    setPontosGanhos(pontos)
    setPoderGanho(null)
    setPhase('answered')
    answeredIds.current.add(questao.id)
    setHiddenAlts(new Set())

    // Poder: escudo protege a streak se errar
    const newStreak = correta ? streak + 1 : (poderAtivo === 'escudo' ? streak : 0)

    // Verificar se ganhou novo poder (a cada 3 acertos seguidos)
    let novoPoder = null
    if (correta && newStreak % 3 === 0 && newStreak > 0) {
      const lista = ['eliminar2', 'mais_tempo', 'dobrar_pts', 'escudo']
      novoPoder = lista[Math.floor(Math.random() * lista.length)]
      setPoderGanho(novoPoder)
    }

    setStreak(newStreak)

    // Escudo: persiste em acertos; outros poderes consumidos após uso
    const escudoAtivo = poderAtivo === 'escudo'
    const nextPoder = novoPoder !== null      ? novoPoder       // novo poder ganho substitui o atual
                    : escudoAtivo && correta ? 'escudo'         // escudo persiste em acertos
                    : null                                       // demais poderes consumidos
    setPoderAtivo(nextPoder)

    const novaPontuacao = pontuacaoTotal + pontos
    const jogUpdates = { streak: newStreak, poder_ativo: nextPoder }
    if (correta) jogUpdates.pontuacao = novaPontuacao

    await Promise.all([
      supabase.from('respostas').upsert({
        jogo_id:    jogo.id,
        questao_id: questao.id,
        jogador_id: jogador.id,
        resposta:   letra,
        correta,
        tempo_ms:   tempoMs,
        pontos,
      }, { onConflict: 'questao_id,jogador_id' }),
      supabase.from('jogadores').update(jogUpdates).eq('id', jogador.id),
    ])

    if (correta) setPontuacaoTotal(novaPontuacao)
  }

  // ── Timer bar color ────────────────────────────────────────────
  const timerColor =
    timeFraction > 0.5 ? 'bg-green-400' :
    timeFraction > 0.25 ? 'bg-yellow-400' : 'bg-red-400'

  // ── Pódio / fim de jogo ────────────────────────────────────────
  if (phase === 'ended') {
    const myPos = rankingData.findIndex((j) => j.id === jogador.id)
    const podiumSlots = [rankingData[1], rankingData[0], rankingData[2]]
    const podiumH  = ['h-16', 'h-24', 'h-12']
    const podiumBg = [
      'bg-slate-400/30  border-t-2 border-slate-400',
      'bg-yellow-500/40 border-t-2 border-yellow-400',
      'bg-orange-500/30 border-t-2 border-orange-400',
    ]
    const rankForSlot = [1, 0, 2]

    return (
      <FullScreen>
        <div className="w-full max-w-md space-y-6 text-center animate-slide-up">
          <div>
            <p className="text-white/40 text-sm uppercase tracking-widest mb-1">{jogo.titulo}</p>
            <h2 className="text-4xl font-black text-white">🏆 Pódio Final</h2>
          </div>

          {/* Posição do jogador */}
          {myPos >= 0 && (
            <div className={`glass-card px-6 py-4 inline-block w-full ${myPos < 3 ? 'border-yellow-400/40' : ''}`}>
              <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Sua posição</p>
              <p className="text-3xl font-black text-white">
                {myPos < 3 ? MEDALS[myPos] : `#${myPos + 1}`}
                &nbsp;{pontuacaoTotal} <span className="text-white/40 text-lg font-normal">pts</span>
              </p>
            </div>
          )}

          {/* Pódio visual */}
          {rankingData.length > 0 && (
            <div className="flex items-end gap-3 justify-center">
              {podiumSlots.map((player, slot) => {
                if (!player) return <div key={slot} className="w-20" />
                const isMe = player.id === jogador.id
                return (
                  <div key={player.id} className={`flex flex-col items-center gap-1 ${isMe ? 'scale-105' : ''}`}>
                    <AvatarDisplay avatar={player.avatar} size="3xl" />
                    <p className={`font-bold text-xs text-center w-20 truncate ${isMe ? 'text-yellow-300' : 'text-white/80'}`}>
                      {player.nome}
                    </p>
                    <div className={`${podiumH[slot]} ${podiumBg[slot]} w-20 rounded-t-xl flex items-start justify-center pt-1.5 text-xl font-black`}>
                      {MEDALS[rankForSlot[slot]]}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button onClick={onEnd} className="btn-primary py-3 w-full">
            Voltar ao início
          </button>
        </div>
      </FullScreen>
    )
  }

  // ── Aguardando questão ─────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <FullScreen>
        <div className="text-center space-y-5 animate-fade-in">
          <AvatarDisplay avatar={jogador.avatar} size="8xl" className="animate-bounce-slow" />
          <h2 className="text-3xl font-black text-white">{jogador.nome}</h2>
          <p className="text-white/60 font-medium">Aguardando o professor iniciar a questão…</p>
          <Dots />
        </div>
      </FullScreen>
    )
  }

  // ── Respondeu / aguardando próxima ─────────────────────────────
  if (phase === 'answered') {
    const myPos = rankingData.findIndex((j) => j.id === jogador.id)
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4 gap-4">

        {/* Feedback da resposta */}
        <div className={`glass-card w-full max-w-2xl p-6 text-center space-y-2 animate-slide-up ${
          isCorrect === true  ? 'border-green-400/50 bg-green-500/10'  :
          isCorrect === false ? 'border-red-400/50 bg-red-500/10'      : ''
        }`}>
          {isCorrect === null && <p className="text-white/60 font-medium text-lg">Tempo esgotado!</p>}
          {isCorrect === true  && <>
            <p className="text-5xl">🎉</p>
            <p className="text-2xl font-black text-green-400">Correto!</p>
            <p className="text-white/60">+<span className="text-yellow-300 font-bold text-xl">{pontosGanhos}</span> pontos</p>
          </>}
          {isCorrect === false && <>
            <p className="text-5xl">😢</p>
            <p className="text-2xl font-black text-red-400">Errado!</p>
            <p className="text-white/60">
              A resposta era <span className="text-white font-bold">{questao?.correta}</span>
            </p>
          </>}
        </div>

        {/* Mini-ranking */}
        {rankingData.length > 0 && (
          <div className="glass-card w-full max-w-2xl p-4 space-y-2 animate-fade-in">
            <h3 className="text-white/40 text-xs uppercase tracking-widest text-center mb-3">Placar Atual</h3>
            {rankingData.slice(0, 5).map((j, i) => (
              <div key={j.id} className={`
                flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all
                ${j.id === jogador.id
                  ? 'bg-purple-500/20 border-purple-400/40'
                  : 'bg-white/5 border-white/10'}
              `}>
                <span className="text-base w-7 text-center shrink-0">
                  {i < 3 ? MEDALS[i] : <span className="text-white/30 text-sm">#{i + 1}</span>}
                </span>
                <AvatarDisplay avatar={j.avatar} size="xl" />
                <span className={`flex-1 font-semibold text-sm truncate ${j.id === jogador.id ? 'text-white' : 'text-white/70'}`}>
                  {j.nome}{j.id === jogador.id ? ' (você)' : ''}
                </span>
                <span className={`font-black text-base shrink-0 ${j.id === jogador.id ? 'text-yellow-300' : 'text-white/60'}`}>
                  {j.id === jogador.id ? pontuacaoTotal : j.pontuacao}
                </span>
              </div>
            ))}
            {myPos >= 5 && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-purple-500/20 border-purple-400/40 mt-1">
                <span className="text-white/30 text-sm w-7 text-center">#{myPos + 1}</span>
                <AvatarDisplay avatar={jogador.avatar} size="xl" />
                <span className="flex-1 text-white font-semibold text-sm">você</span>
                <span className="text-yellow-300 font-black text-base">{pontuacaoTotal}</span>
              </div>
            )}
          </div>
        )}

        {/* Poder desbloqueado */}
        {poderGanho && POWERS[poderGanho] && (
          <div className="glass-card w-full max-w-2xl p-4 border-yellow-400/30 bg-yellow-500/10 text-center space-y-1 animate-slide-up">
            <p className="text-yellow-300/70 text-xs uppercase tracking-widest">⚡ Poder desbloqueado!</p>
            <p className="text-3xl">{POWERS[poderGanho].emoji}</p>
            <p className="text-white font-bold">{POWERS[poderGanho].nome}</p>
            <p className="text-white/50 text-xs">{POWERS[poderGanho].desc} · Ativa na próxima questão</p>
          </div>
        )}

        <div className="text-white/30 text-xs">Aguardando próxima questão…</div>
        <Dots />
      </div>
    )
  }

  // ── Respondendo ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col">

      <div className="h-2 w-full bg-white/10">
        <div className={`h-full transition-all duration-1000 ${timerColor}`}
          style={{ width: `${timeFraction * 100}%` }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        <div className="glass-card w-full max-w-2xl p-6 text-center space-y-3">
          {totalQuestoes > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs uppercase tracking-widest shrink-0">
                Questão {questao?.ordem} de {totalQuestoes}
              </span>
              <div className="flex-1 h-0.5 bg-white/10 rounded-full">
                <div
                  className="h-full bg-white/30 rounded-full transition-all duration-500"
                  style={{ width: `${((questao?.ordem ?? 0) / totalQuestoes) * 100}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-white/40 text-xs font-semibold uppercase tracking-widest">
            <span>⏱ {timeLeft}s</span>
            {streak > 0 && <span className="text-orange-400 font-black">🔥 {streak}x</span>}
            <span>🎖️ {pontuacaoTotal} pts</span>
          </div>
          <QuestionImage imagemUrl={questao?.imagem_url} seed={questao?.ordem ?? 0} />
          <p className="text-xl sm:text-2xl font-bold text-white leading-snug">
            {questao?.pergunta}
          </p>
        </div>

        {/* Poder ativo */}
        {poderAtivo && POWERS[poderAtivo] && (
          <div className="flex items-center gap-3 bg-indigo-500/20 border border-indigo-400/40 rounded-2xl px-4 py-2.5 w-full max-w-2xl animate-fade-in">
            <span className="text-2xl">{POWERS[poderAtivo].emoji}</span>
            <div>
              <p className="text-indigo-200 font-bold text-sm">{POWERS[poderAtivo].nome}</p>
              <p className="text-white/40 text-xs">{POWERS[poderAtivo].desc}</p>
            </div>
            <span className="ml-auto text-xs bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">ATIVO</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
          {['A', 'B', 'C', 'D'].map((letra) =>
            hiddenAlts.has(letra) ? (
              <div key={letra} className="rounded-2xl p-5 bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-white/20 text-3xl">✗</span>
              </div>
            ) : (
              <button
                key={letra}
                type="button"
                onClick={() => handleAnswer(letra)}
                disabled={!!selectedAnswer}
                className={`
                  ${ALT_CONFIG[letra].bg} rounded-2xl p-5 text-white font-extrabold text-lg
                  flex items-center gap-3 shadow-lg
                  active:scale-95 transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <span className="text-2xl">{ALT_CONFIG[letra].icon}</span>
                <span className="text-left leading-tight">{questao?.[`alt_${letra.toLowerCase()}`]}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function FullScreen({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full flex justify-center">{children}</div>
    </div>
  )
}

function Dots() {
  return (
    <div className="flex justify-center gap-2 pt-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}
