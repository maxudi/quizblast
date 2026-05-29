import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

import HomeScreen          from '@/components/HomeScreen'
import JoinGameScreen      from '@/components/JoinGameScreen'
import WaitingRoom         from '@/components/WaitingRoom'
import HostLoginScreen     from '@/components/host/HostLoginScreen'
import MyGamesScreen       from '@/components/host/MyGamesScreen'
import CreateGameScreen    from '@/components/host/CreateGameScreen'
import HostLobby           from '@/components/host/HostLobby'
import HostGameScreen      from '@/components/host/HostGameScreen'
import PlayerGameScreen    from '@/components/player/PlayerGameScreen'
import TrainingJoinScreen  from '@/components/player/TrainingJoinScreen'
import TrainingLobby       from '@/components/player/TrainingLobby'

// ── Captura link de treino da URL (executado uma vez ao carregar) ──────
const _treinoQuizId = (() => {
  const t = new URLSearchParams(window.location.search).get('t')
  if (t) window.history.replaceState({}, '', window.location.pathname)
  return t ?? null
})()

export default function App() {
  const { session, user, isLoading, signOut } = useAuth()

  const [screen,    setScreen]   = useState(_treinoQuizId ? 'treino-join' : 'home')
  const [gameData,  setGameData] = useState(_treinoQuizId ? { quizId: _treinoQuizId } : null)

  if (isLoading) return <SplashScreen />

  function goHome()           { setScreen('home');      setGameData(null) }
  function goToHostGames()    { setScreen('host-games')                   }
  async function handleSignOut() { await signOut(); goHome() }
  function goToHostArea()     { setScreen(session ? 'host-games' : 'host-login') }

  switch (screen) {

    case 'home':
      return (
        <HomeScreen
          onSelectHost={goToHostArea}
          onSelectPlayer={() => setScreen('player-join')}
        />
      )

    // ── Professor ──────────────────────────────────────────────────
    case 'host-login':
      return (
        <HostLoginScreen
          onSuccess={goToHostGames}
          onBack={goHome}
        />
      )

    case 'host-games':
      return (
        <MyGamesScreen
          user={user}
          onCreate={() => setScreen('host-create')}
          onResume={(jogo) => { setGameData({ jogo }); setScreen('host-lobby') }}
          onBack={goHome}
          onSignOut={handleSignOut}
        />
      )

    case 'host-create':
      return (
        <CreateGameScreen
          user={user}
          onCreated={(jogo) => { setGameData({ jogo }); setScreen('host-lobby') }}
          onBack={goToHostGames}
          onSignOut={handleSignOut}
        />
      )

    case 'host-lobby':
      return (
        <HostLobby
          jogo={gameData.jogo}
          onStart={(jogoAtualizado) => {
            setGameData({ jogo: jogoAtualizado })
            setScreen('host-game')
          }}
          onEnd={goToHostGames}
          onSignOut={handleSignOut}
        />
      )

    case 'host-game':
      return (
        <HostGameScreen
          jogo={gameData.jogo}
          onEnd={goToHostGames}
          onSignOut={handleSignOut}
        />
      )

    // ── Aluno ──────────────────────────────────────────────────────
    case 'player-join':
      return (
        <JoinGameScreen
          onJoin={(jogador, jogo) => {
            setGameData({ jogador, jogo })
            setScreen('player-waiting')
          }}
        />
      )

    case 'player-waiting':
      return (
        <WaitingRoom
          jogador={gameData.jogador}
          jogo={gameData.jogo}
          onLeave={goHome}
          onStart={() => setScreen('player-game')}
        />
      )

    case 'player-game':
      return (
        <PlayerGameScreen
          jogador={gameData.jogador}
          jogo={gameData.jogo}
          onEnd={goHome}
        />
      )

    // ── Modo Treino ────────────────────────────────────────────
    case 'treino-join':
      return (
        <TrainingJoinScreen
          quizId={gameData.quizId}
          onJoin={(jogador, jogoTreino, isMgr) => {
            setGameData({ jogador, jogo: jogoTreino, isManager: isMgr })
            setScreen('treino-lobby')
          }}
          onBack={goHome}
        />
      )

    case 'treino-lobby':
      return (
        <TrainingLobby
          jogador={gameData.jogador}
          jogo={gameData.jogo}
          isManager={gameData.isManager}
          onStart={() => setScreen('treino-game')}
          onBack={goHome}
        />
      )

    case 'treino-game':
      return (
        <PlayerGameScreen
          jogador={gameData.jogador}
          jogo={gameData.jogo}
          isManager={gameData.isManager}
          onEnd={goHome}
        />
      )

    default:
      return <HomeScreen onSelectHost={goToHostArea} onSelectPlayer={() => setScreen('player-join')} />
  }
}

function SplashScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl animate-bounce-slow">⚡</div>
        <p className="text-white/50 text-sm font-medium">Carregando...</p>
      </div>
    </div>
  )
}


