import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

/**
 * Hook para gerenciar a sessão de autenticação do Supabase.
 * - `session === undefined` → ainda carregando
 * - `session === null`      → não autenticado
 * - `session` com valor     → autenticado
 */
export function useAuth() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Lê a sessão existente (ex: após refresh da página)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    // Escuta mudanças de estado (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email, password) {
    return supabase.auth.signUp({ email, password })
  }

  async function signOut() {
    return supabase.auth.signOut()
  }

  return {
    session,
    user:      session?.user ?? null,
    isLoading: session === undefined,
    signIn,
    signUp,
    signOut,
  }
}
