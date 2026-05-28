import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

/**
 * Tela de login/cadastro do professor (host).
 * Após autenticação bem-sucedida chama `onSuccess()`.
 */
export default function HostLoginScreen({ onSuccess, onBack }) {
  const { signIn, signUp } = useAuth()

  const [mode, setMode]       = useState('login') // 'login' | 'register'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [info, setInfo]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.')
      return
    }

    setIsLoading(true)

    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email.trim(), password)
        if (err) throw err
        onSuccess()
      } else {
        const { error: err } = await signUp(email.trim(), password)
        if (err) throw err
        setInfo('Conta criada! Verifique seu e-mail para confirmar o cadastro e então faça o login.')
        setMode('login')
      }
    } catch (err) {
      const messages = {
        'Invalid login credentials':    'E-mail ou senha incorretos.',
        'Email not confirmed':          'Confirme seu e-mail antes de entrar.',
        'User already registered':      'Este e-mail já está cadastrado. Faça o login.',
        'Password should be at least 6 characters': 'A senha deve ter ao menos 6 caracteres.',
      }
      setError(messages[err.message] ?? err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4">

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up space-y-6">

        <header className="text-center">
          <div className="w-20 h-20 bg-purple-500/30 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-4">
            👨‍🏫
          </div>
          <h1 className="text-3xl font-black text-white">
            {mode === 'login' ? 'Entrar como Professor' : 'Criar conta'}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {mode === 'login'
              ? 'Acesse o painel para criar e gerenciar quizzes'
              : 'Crie uma conta para hospedar quizzes'}
          </p>
        </header>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            <div className="space-y-2">
              <label htmlFor="email" className="block text-white/70 text-sm font-semibold uppercase tracking-widest">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="professor@escola.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                disabled={isLoading}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-white/70 text-sm font-semibold uppercase tracking-widest">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                disabled={isLoading}
                className="input-field"
              />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 bg-red-500/20 border border-red-400/40 rounded-2xl px-4 py-3 text-red-300 text-sm font-medium animate-fade-in">
                <span aria-hidden="true" className="shrink-0">⚠️</span>
                {error}
              </div>
            )}

            {info && (
              <div role="status" className="flex items-start gap-2 bg-green-500/20 border border-green-400/40 rounded-2xl px-4 py-3 text-green-300 text-sm font-medium animate-fade-in">
                <span aria-hidden="true" className="shrink-0">✅</span>
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              aria-busy={isLoading}
            >
              {isLoading
                ? <span className="flex items-center justify-center gap-2"><Spinner /> Aguarde...</span>
                : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>

          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setInfo(null) }}
              className="text-white/50 hover:text-white/80 text-sm transition-colors underline underline-offset-4"
            >
              {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tenho conta — Entrar'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <button type="button" onClick={onBack} className="text-white/40 hover:text-white/70 text-sm transition-colors">
            ← Voltar ao início
          </button>
        </div>

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
