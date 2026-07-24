import React from 'react'
import { useAuth } from '../useAuth'
import { RunesContext, type RunesTab } from './RunesContext'

interface RunesProviderProps {
  children: React.ReactNode
}

export function RunesProvider({ children }: RunesProviderProps) {
  const { user } = useAuth()
  const isMJ = user?.role === 'mj'

  const hash = window.location.hash
  const params = new URLSearchParams(hash.split('?')[1] ?? '')
  const initialTab = (params.get('tab') as RunesTab) ?? 'grimoire'

  const [activeTab, setActiveTabState] = React.useState<RunesTab>(
    isMJ || initialTab !== 'review' ? initialTab : 'grimoire',
  )
  const [selectedCharacterId, setSelectedCharacterId] = React.useState<number | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<number | null>(null)

  const setActiveTab = React.useCallback((tab: RunesTab) => {
    setActiveTabState(tab)
    const base = '#/jdr/runes'
    const url = tab === 'grimoire' ? base : `${base}?tab=${tab}`
    window.location.hash = url
  }, [])

  React.useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash
      const p = new URLSearchParams(h.split('?')[1] ?? '')
      const t = p.get('tab') as RunesTab | null
      if (t && ['grimoire', 'canvas', 'drawings', 'collection', 'review'].includes(t)) {
        if (t !== 'review' || isMJ) {
          setActiveTabState(t)
        }
      } else {
        setActiveTabState('grimoire')
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isMJ])

  const value = React.useMemo(
    () => ({
      activeTab,
      setActiveTab,
      selectedCharacterId,
      setSelectedCharacterId,
      selectedTemplateId,
      setSelectedTemplateId,
      isMJ,
    }),
    [activeTab, setActiveTab, selectedCharacterId, selectedTemplateId, isMJ],
  )

  return <RunesContext.Provider value={value}>{children}</RunesContext.Provider>
}
