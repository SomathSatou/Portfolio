import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import type { Campaign, CharacterWithStats, ChatMessage } from '../Dashboard/types'
import CharacterSessionCard from './CharacterSessionCard'
import SessionChat from './SessionChat'
import SessionNotes from './SessionNotes'
import SessionSidebar from './SessionSidebar'
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
  const [toggling, setToggling] = React.useState(false)

  const isMJ = campaign ? campaign.game_master === user?.id : user?.role === 'mj'
  const myCharacterId = React.useMemo(() => {
    if (!user || isMJ) return null
    const myChar = characters.find((c) => c.player === user.id)
    return myChar?.id ?? null
  }, [characters, user, isMJ])
  const sessionActive = campaign?.session_active ?? false
  const { messages, connected, sendMessage, setInitialMessages, reconnect, retryCount } = useChat({ campaignId, enabled: sessionActive || isMJ })

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

  const handleToggleSession = async () => {
    if (toggling) return
    setToggling(true)
    try {
      const res = await api.post<Campaign>(`/campaigns/${campaignId}/toggle-session/`)
      setCampaign(res.data)
    } catch {
      // ignore
    } finally {
      setToggling(false)
    }
  }

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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">
          🎮 Session — {campaign?.name}
        </h1>
        {isMJ && (
          <button
            onClick={handleToggleSession}
            disabled={toggling}
            className={`btn text-sm ${sessionActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-accent'}`}
          >
            {toggling
              ? '...'
              : sessionActive
                ? '⏹ Arrêter la session'
                : '▶ Lancer la session'}
          </button>
        )}
      </div>
      {sessionActive && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">Session en cours</span>
        </div>
      )}
      {!sessionActive && !isMJ && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">En attente du lancement de la session par le MJ</span>
        </div>
      )}

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
            onReconnect={reconnect}
            retryCount={retryCount}
          />
        </div>

        {/* Right: Notes */}
        <div className="lg:col-span-4">
          <SessionNotes campaignId={campaignId} isMJ={isMJ} />
        </div>
      </div>

      {/* Sidebar drawer for quick spell/item access */}
      {!isMJ && (
        <SessionSidebar
          campaignId={campaignId}
          characterId={myCharacterId}
          onRoll={sendMessage}
        />
      )}
    </div>
  )
}
