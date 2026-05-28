import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

const POLL_INTERVAL_MS = 2000

/**
 * Polling + Realtime para detectar mudança de status de um jogo.
 * Chama `onStatusChange(novoStatus)` sempre que o status mudar.
 *
 * @param {string}   jogoId
 * @param {string}   statusAtual   — status atual conhecido
 * @param {Function} onStatusChange
 */
export function useGameStatus(jogoId, statusAtual, onStatusChange) {
  const statusRef        = useRef(statusAtual)
  const onChangeRef      = useRef(onStatusChange)
  const pollRef          = useRef(null)
  const channelRef       = useRef(null)

  useEffect(() => { statusRef.current   = statusAtual },    [statusAtual])
  useEffect(() => { onChangeRef.current = onStatusChange }, [onStatusChange])

  const checkStatus = useCallback(async () => {
    if (!jogoId) return
    const { data } = await supabase
      .from('jogos')
      .select('status')
      .eq('id', jogoId)
      .single()

    if (data && data.status !== statusRef.current) {
      statusRef.current = data.status
      onChangeRef.current?.(data.status)
    }
  }, [jogoId])

  useEffect(() => {
    if (!jogoId) return

    // Poll periódico
    pollRef.current = setInterval(checkStatus, POLL_INTERVAL_MS)

    // Realtime como bônus
    channelRef.current = supabase
      .channel(`game-status:${jogoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jogos' },
        (payload) => {
          if (payload.new?.id !== jogoId) return
          if (payload.new.status !== statusRef.current) {
            statusRef.current = payload.new.status
            onChangeRef.current?.(payload.new.status)
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollRef.current)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [jogoId, checkStatus])
}
