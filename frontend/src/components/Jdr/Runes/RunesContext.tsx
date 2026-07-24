import React from 'react'

export type RunesTab = 'grimoire' | 'canvas' | 'drawings' | 'collection' | 'review'

export interface RunesContextValue {
  activeTab: RunesTab
  setActiveTab: (tab: RunesTab) => void
  selectedCharacterId: number | null
  setSelectedCharacterId: (id: number | null) => void
  selectedTemplateId: number | null
  setSelectedTemplateId: (id: number | null) => void
  isMJ: boolean
}

export const RunesContext = React.createContext<RunesContextValue | undefined>(undefined)
