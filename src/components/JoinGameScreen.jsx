import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AvatarSelector from '@/components/AvatarSelector'
import { AVATARS } from '@/constants/avatars'

// Comprimento exato do PIN da sala
const PIN_LENGTH = 6

/**
 * Tela de entrada do jogador.
 *
 * Fluxo:
 *  1. Jogador informa o PIN da sala, seu nome e escolhe um avatar
 *  2. O componente valida os campos e busca o jogo correspondente ao PIN
 *  3. Insere o jogador na tabela `jogadores` via Supabase
 *  4. Chama `onJoin` passando os dados do jogador e do jogo criados
 *
 * @param {Function} onJoin  — callback(jogador, jogo) chamado após entrar com sucesso
 */
export default function JoinGameScreen({ onJoin }) {
  const [pin, setPin]         = useState('')
  const [nome, setNome]       = useState('')
  const [avatar, setAvatar]   = useState(AVATARS[0].emoji)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]     = useState(null)

  // ------------------------------------------------------------------
  // Validação dos campos antes de submeter
  // ------------------------------------------------------------------
  function validate() {
    if (pin.trim().length !== PIN_LENGTH) {
      return `O PIN deve ter exatamente ${PIN_LENGTH} dígitos.`
    }
    if (nome.trim().length < 2) {
      return 'Seu nome precisa ter pelo menos 2 caracteres.'
    }
    if (nome.trim().length > 30) {
      return 'Seu nome pode ter no máximo 30 caracteres.'
    }
    return null
  }

  // ------------------------------------------------------------------
  // Submissão do formulário
  // ------------------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    try {
      // 1. Busca o jogo pelo PIN
      const { data: jogos, error: jogoError } = await supabase
        .from('jogos')
        .select('id, titulo, status, pin_sala')
        .eq('pin_sala', pin.trim())
        .single()

      if (jogoError || !jogos) {
        setError('Sala não encontrada. Verifique o PIN e tente novamente.')
        return
      }

      if (jogos.status !== 'aguardando') {
        const mensagens = {
          em_andamento: 'Este jogo já está em andamento. Aguarde a próxima partida!',
          finalizado:   'Este jogo já foi encerrado.',
        }
        setError(mensagens[jogos.status] ?? 'Não é possível entrar nesta sala agora.')
        return
      }

      // 2. Verifica se o nome já está em uso na sala
      const { data: nomeEmUso } = await supabase
        .from('jogadores')
        .select('id')
        .eq('jogo_id', jogos.id)
        .ilike('nome', nome.trim())
        .maybeSingle()

      if (nomeEmUso) {
        setError('Este nome já está sendo usado nesta sala. Escolha outro.')
        return
      }

      // 3. Insere o jogador na sala
      const { data: jogador, error: insertError } = await supabase
        .from('jogadores')
        .insert({
          jogo_id: jogos.id,
          nome:    nome.trim(),
          avatar,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      onJoin?.(jogador, jogos)
    } catch (err) {
      console.error('[JoinGameScreen] Erro ao entrar na sala:', err)
      setError('Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // ------------------------------------------------------------------
  // Handler do PIN — aceita apenas dígitos e limita ao comprimento
  // ------------------------------------------------------------------
  function handlePinChange(e) {
    const value = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(value)
    if (error) setError(null)
  }

  // Formulário válido para habilitar o botão
  const isFormValid =
    pin.trim().length === PIN_LENGTH &&
    nome.trim().length >= 2 &&
    !isLoading

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4">

      {/* Orbes decorativos de fundo */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">

        {/* Cabeçalho / Logo */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <span className="text-4xl">⚡</span>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              QuizBlast
            </h1>
            <span className="text-4xl">⚡</span>
          </div>
          <p className="text-white/50 text-sm font-medium tracking-wide">
            Quiz gamificado em tempo real
          </p>
        </header>

        {/* Card principal */}
        <div className="glass-card p-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">

            {/* Campo: PIN da sala */}
            <div className="space-y-2">
              <label
                htmlFor="pin"
                className="block text-white/70 text-sm font-semibold uppercase tracking-widest"
              >
                PIN da Sala
              </label>
              <input
                id="pin"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={PIN_LENGTH}
                placeholder="000000"
                value={pin}
                onChange={handlePinChange}
                disabled={isLoading}
                autoComplete="off"
                className={[
                  'input-field text-center text-3xl font-black tracking-[0.5em] placeholder-tracking-normal',
                  'placeholder:tracking-normal placeholder:text-2xl placeholder:font-semibold',
                ].join(' ')}
                aria-describedby={error ? 'form-error' : undefined}
              />
              {/* Indicador de progresso do PIN */}
              <div className="flex gap-1.5 justify-center mt-2" aria-hidden="true">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <div
                    key={i}
                    className={[
                      'h-1 flex-1 rounded-full transition-all duration-200',
                      i < pin.length ? 'bg-green-400' : 'bg-white/20',
                    ].join(' ')}
                  />
                ))}
              </div>
            </div>

            {/* Campo: Nome / Nickname */}
            <div className="space-y-2">
              <label
                htmlFor="nome"
                className="block text-white/70 text-sm font-semibold uppercase tracking-widest"
              >
                Seu Nome / Nickname
              </label>
              <input
                id="nome"
                type="text"
                placeholder="Como quer ser chamado?"
                maxLength={30}
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (error) setError(null)
                }}
                disabled={isLoading}
                autoComplete="nickname"
                className="input-field"
                aria-describedby={error ? 'form-error' : undefined}
              />
              <div className="text-right text-white/40 text-xs font-medium">
                {nome.length}/30
              </div>
            </div>

            {/* Seletor de Avatars */}
            <AvatarSelector value={avatar} onChange={setAvatar} />

            {/* Mensagem de erro */}
            {error && (
              <div
                id="form-error"
                role="alert"
                className="flex items-start gap-2 bg-red-500/20 border border-red-400/40 rounded-2xl px-4 py-3 text-red-300 text-sm font-medium animate-fade-in"
              >
                <span aria-hidden="true" className="shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Botão de submissão */}
            <button
              type="submit"
              disabled={!isFormValid}
              className="btn-primary"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <LoadingSpinner />
                  Entrando na sala...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="text-2xl">{avatar}</span>
                  Entrar no Jogo
                </span>
              )}
            </button>

          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Peça o PIN ao seu professor ou organizador da partida
        </p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Sub-componente: spinner de carregamento
// ------------------------------------------------------------------
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
