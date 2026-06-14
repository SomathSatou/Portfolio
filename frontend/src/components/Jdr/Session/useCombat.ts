import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api'
import type { CombatSession } from '../Dashboard/types'

interface UseCombatOptions {
  campaignId: string | number
  enabled?: boolean
}

export default function useCombat({ campaignId, enabled = true }: UseCombatOptions) {
  const [combatState, setCombatState] = useState<CombatSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchCombat = useCallback(async () => {
    if (!enabled) return
    try {
      const res = await api.get<CombatSession | { is_active: false; participants: [] }>(
        `/campaigns/${campaignId}/combat/`,
      )
      if (mountedRef.current) {
        const data = res.data as CombatSession
        setCombatState(data.id ? data : null)
      }
    } catch {
      // non-fatal — combat may not exist yet
      if (mountedRef.current) setCombatState(null)
    }
  }, [campaignId, enabled])

  useEffect(() => { fetchCombat() }, [fetchCombat])

  const startCombat = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post<CombatSession>(`/campaigns/${campaignId}/combat/start/`)
      if (mountedRef.current) setCombatState(res.data)
      return res.data
    } catch {
      if (mountedRef.current) setError('Impossible de démarrer le combat.')
      return null
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [campaignId])

  const endCombat = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post<CombatSession>(`/campaigns/${campaignId}/combat/end/`)
      if (mountedRef.current) setCombatState(res.data)
      return res.data
    } catch {
      if (mountedRef.current) setError('Impossible de terminer le combat.')
      return null
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [campaignId])

  const nextTurn = useCallback(async () => {
    try {
      const res = await api.post<CombatSession>(`/campaigns/${campaignId}/combat/next-turn/`)
      if (mountedRef.current) setCombatState(res.data)
      return res.data
    } catch {
      return null
    }
  }, [campaignId])

  const addParticipant = useCallback(async (payload: {
    character_id?: number | null
    monster_id?: number | null
    monster_name?: string
    hp?: number
    initiative?: number
  }) => {
    try {
      const res = await api.post<CombatSession>(
        `/campaigns/${campaignId}/combat/add-participant/`, payload,
      )
      if (mountedRef.current) setCombatState(res.data)
      return res.data
    } catch {
      return null
    }
  }, [campaignId])

  const updateHp = useCallback(async (participantId: number, hpCurrent: number) => {
    try {
      const res = await api.patch<CombatSession>(`/campaigns/${campaignId}/combat/update-hp/`, {
        participant_id: participantId,
        hp_current: hpCurrent,
      })
      if (mountedRef.current) setCombatState(res.data)
      return res.data
    } catch {
      return null
    }
  }, [campaignId])

  const onWsEvent = useCallback((event: string, combat: CombatSession) => {
    if (['combat_start', 'combat_end', 'combat_next_turn', 'combat_participant_add', 'combat_hp_update'].includes(event)) {
      if (mountedRef.current) setCombatState(combat.is_active || combat.participants?.length ? combat : null)
    }
  }, [])

  return {
    combatState,
    loading,
    error,
    fetchCombat,
    startCombat,
    endCombat,
    nextTurn,
    addParticipant,
    updateHp,
    onWsEvent,
  }
}
