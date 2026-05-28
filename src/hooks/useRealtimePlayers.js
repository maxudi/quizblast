import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

const POLL_INTERVAL_MS = 2500

/**
 * Hook que mantém a lista de jogadores sincronizada para um determinado jogo.
 *
 * Estratégia dupla (garante funcionamento mesmo sem Realtime publicado):
 *  1. Polling a cada 2,5 s — sempre funciona, independente de configuração.
 *  2. Supabase Realtime (postgres_changes) — quando disponível, entrega
 *     atualizações instantâneas e o polling serve como reconciliação.
 *
 * @param {string|null} jogoId
 */
export function useRealtimePlayers(jogoId) {
  const [jogadores, setJogadores]     = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError]             = useState(null)

  const channelRef  = useRef(null)
  const pollRef     = useRef(null)
  const jogoIdRef   = useRef(jogoId)

  // Mantém a ref sempre atualizada para uso dentro de closures
  useEffect(() => { jogoIdRef.current = jogoId }, [jogoId])

  // ------------------------------------------------------------------
  // Fetch canônico — única fonte de verdade, usada pelo poll e no mount
  // ------------------------------------------------------------------
  const fetchJogadores = useCallback(async () => {
    const id = jogoIdRef.current
    if (!id) return

    const { data, error: err } = await supabase
      .from('jogadores')
      .select('*')
      .eq('jogo_id', id)
      .order('entrou_em', { ascending: true })

    if (err) {
      setError(err)
      return
    }

    setJogadores((prev) => {
      // Só re-renderiza se a lista realmente mudou (compara por ids)
      const prevIds = prev.map((j) => j.id).join(',')
      const newIds  = (data ?? []).map((j) => j.id).join(',')
      if (prevIds === newIds) return prev
      return data ?? []
    })
  }, [])

  useEffect(() => {
    if (!jogoId) {
      setJogadores([])
      return
    }

    // 1. Fetch imediato ao montar / trocar de jogo
    fetchJogadores()

    // 2. Polling periódico como mecanismo principal
    pollRef.current = setInterval(fetchJogadores, POLL_INTERVAL_MS)

    // 3. Realtime como otimização (entrega instantânea quando publicado)
    const channelName = `realtime:jogadores:${jogoId}`

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jogadores' },
        (payload) => {
          const row = payload.new ?? payload.old
          if (!row || row.jogo_id !== jogoId) return

          if (payload.eventType === 'INSERT') {
            setJogadores((prev) => {
              if (prev.some((j) => j.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
          }
          if (payload.eventType === 'UPDATE') {
            setJogadores((prev) =>
              prev.map((j) => (j.id === payload.new.id ? payload.new : j))
            )
          }
          if (payload.eventType === 'DELETE') {
            setJogadores((prev) => prev.filter((j) => j.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      clearInterval(pollRef.current)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [jogoId, fetchJogadores])

  return { jogadores, isConnected, error }
}

