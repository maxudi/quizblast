/**
 * Tela inicial — escolha de modo: Professor (host) ou Aluno (player).
 */
export default function HomeScreen({ onSelectHost, onSelectPlayer }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4">

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl space-y-10 animate-slide-up">

        {/* Logo */}
        <header className="text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <span className="text-5xl">⚡</span>
            <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              QuizBlast
            </h1>
            <span className="text-5xl">⚡</span>
          </div>
          <p className="text-white/50 font-medium">Quiz gamificado em tempo real</p>
        </header>

        {/* Cards de seleção */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Professor / Host */}
          <button
            type="button"
            onClick={onSelectHost}
            className="group glass-card p-8 text-left space-y-4 hover:bg-white/20 hover:border-purple-400/50 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <div className="w-16 h-16 bg-purple-500/30 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-200">
              👨‍🏫
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Sou Professor</h2>
              <p className="text-white/55 text-sm mt-1 leading-relaxed">
                Crie um quiz, gere o PIN da sala e acompanhe os alunos em tempo real.
              </p>
            </div>
            <div className="flex items-center gap-2 text-purple-300 text-sm font-semibold">
              Criar sala
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </div>
          </button>

          {/* Aluno / Player */}
          <button
            type="button"
            onClick={onSelectPlayer}
            className="group glass-card p-8 text-left space-y-4 hover:bg-white/20 hover:border-green-400/50 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            <div className="w-16 h-16 bg-green-500/30 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-200">
              🎮
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Sou Aluno</h2>
              <p className="text-white/55 text-sm mt-1 leading-relaxed">
                Entre em uma sala com o PIN do professor e compita com os colegas.
              </p>
            </div>
            <div className="flex items-center gap-2 text-green-300 text-sm font-semibold">
              Entrar na sala
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </div>
          </button>

        </div>
      </div>
    </div>
  )
}
