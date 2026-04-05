import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import type { Campaign, CharacterWithStats, ChatMessage } from '../Dashboard/types'
import CharacterSessionCard from './CharacterSessionCard'
import SessionChat from './SessionChat'
import SessionNotes from './SessionNotes'
import useChat from './useChat'

interface Props {
  campaignId: string
}

export default function SessionPage({ campaignId }: Props) {
  const { user } = useAuth()
  const [campaign, setCampaign] = React.useState<Campaign | null>(null)
  const [characters, setCharacters] = React.useState<CharacterWithStats[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  const isMJ = user?.role === 'mj'
  const { messages, connected, sendMessage, setInitialMessages } = useChat({ campaignId })

  // Load campaign + characters with stats + chat history
  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.get<Campaign>(`/campaigns/${campaignId}/`),
      api.get<CharacterWithStats[]>(`/campaigns/${campaignId}/characters-with-stats/`),
      api.get<ChatMessage[]>(`/chat-messages/?campaign=${campaignId}&limit=200`),
    ])
      .then(([campRes, charRes, chatRes]) => {
        if (cancelled) return
        setCampaign(campRes.data)
        setCharacters(charRes.data)
        setInitialMessages(chatRes.data)
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger la session.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [campaignId, setInitialMessages])

  const handleWalletChange = (characterId: number, field: 'gold' | 'silver' | 'copper', value: number) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === characterId ? { ...c, [field]: value } : c)),
    )
    // Debounced save — fire immediately for simplicity
    api.patch(`/campaigns/${campaignId}/wallets/`, {
      wallets: [{ character_id: characterId, [field]: value }],
    }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Chargement de la session…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500">{error}</p>
        <a href="#/jdr/dashboard" className="btn btn-outline mt-4">Retour au dashboard</a>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <a href="#/jdr/dashboard" className="hover:underline">Dashboard</a>
        <span className="mx-2">/</span>
        <a href={`#/jdr/campaign/${campaignId}`} className="hover:underline">{campaign?.name}</a>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">Session en direct</span>
      </nav>

      <h1 className="text-2xl font-bold text-primary dark:text-primaryLight mb-6">
        🎮 Session — {campaign?.name}
      </h1>

      {/* 3-column layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Character cards */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Personnages ({characters.length})
          </h2>
          {characters.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun personnage dans cette campagne.</p>
          ) : (
            characters.map((c) => (
              <CharacterSessionCard
                key={c.id}
                character={c}
                isMJ={isMJ}
                onWalletChange={handleWalletChange}
              />
            ))
          )}
        </div>

        {/* Center: Chat */}
        <div className="lg:col-span-5">
          <SessionChat
            messages={messages}
            connected={connected}
            onSend={sendMessage}
            currentUserId={user?.id}
          />
        </div>

        {/* Right: Notes */}
        <div className="lg:col-span-4">
          <SessionNotes campaignId={campaignId} isMJ={isMJ} />
        </div>
      </div>
    </div>
  )
}
