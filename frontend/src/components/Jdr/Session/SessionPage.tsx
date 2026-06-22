import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import type { Campaign, CharacterWithStats, ChatMessage, CombatSession, Monster } from '../Dashboard/types'
import CharacterSessionCard from './CharacterSessionCard'
import MonsterSessionCard from './MonsterSessionCard'
import SessionChat from './SessionChat'
import SessionNotes from './SessionNotes'
import SessionSidebar from './SessionSidebar'
import useChat from './useChat'
import useCombat from './useCombat'
import CombatTracker from './CombatTracker'
import CampaignInventoryPanel from './CampaignInventoryPanel'
import CharacterDetailDrawer from './CharacterDetailDrawer'
import CharacterSpellsDrawer from './CharacterSpellsDrawer'
import CharacterSkillsDrawer from './CharacterSkillsDrawer'
import CharacterInventoryDrawer from './CharacterInventoryDrawer'

interface Props {
  campaignId: string
}

export default function SessionPage({ campaignId }: Props) {
  const { user } = useAuth()
  const [campaign, setCampaign] = React.useState<Campaign | null>(null)
  const [characters, setCharacters] = React.useState<CharacterWithStats[]>([])
  const [monsters, setMonsters] = React.useState<Monster[]>([])
  const [activeMonsterIds, setActiveMonsterIds] = React.useState<Set<number>>(new Set())
  const [mjTab, setMjTab] = React.useState<'players' | 'monsters'>('players')
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

  const [inventoryKey, setInventoryKey] = React.useState(0)
  const [showInventory, setShowInventory] = React.useState(false)

  // Drawer states (null = closed, number = characterId)
  const [drawerDetail, setDrawerDetail] = React.useState<number | null>(null)
  const [drawerSpells, setDrawerSpells] = React.useState<number | null>(null)
  const [drawerSkills, setDrawerSkills] = React.useState<number | null>(null)
  const [drawerInventory, setDrawerInventory] = React.useState<number | null>(null)

  const { combatState, startCombat, endCombat, nextTurn, addParticipant, updateHp, onWsEvent } =
    useCombat({ campaignId, enabled: sessionActive || isMJ })

  const { messages, connected, sendMessage, setInitialMessages, reconnect, retryCount } = useChat({
    campaignId,
    enabled: sessionActive || isMJ,
    onMessage: (msg: Record<string, unknown>) => {
      if (msg.type === 'combat_event' && msg.event && msg.combat) {
        onWsEvent(msg.event as string, msg.combat as CombatSession)
      }
      if (msg.type === 'inventory_update') {
        setInventoryKey((k) => k + 1)
      }
    },
  })

  // Load campaign + characters with stats + chat history
  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.get<Campaign>(`/campaigns/${campaignId}/`),
      api.get<CharacterWithStats[]>(`/campaigns/${campaignId}/characters-with-stats/`),
      api.get<ChatMessage[]>(`/chat-messages/?campaign=${campaignId}&limit=200`),
      api.get<Monster[]>(`/monsters/?campaign=${campaignId}`),
    ])
      .then(([campRes, charRes, chatRes, monsterRes]) => {
        if (cancelled) return
        setCampaign(campRes.data)
        setCharacters(charRes.data)
        setInitialMessages(chatRes.data)
        setMonsters(monsterRes.data)
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

  const combatActive = combatState?.is_active ?? false

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

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">
          🎮 Session — {campaign?.name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {isMJ && !combatActive && sessionActive && (
            <button
              onClick={() => startCombat()}
              className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
            >
              ⚔️ Lancer le combat
            </button>
          )}
          <button
            onClick={() => setShowInventory((v) => !v)}
            className="btn btn-outline text-sm"
          >
            🎒 Sac de Lug
          </button>
          {isMJ && (
            <button
              onClick={handleToggleSession}
              disabled={toggling}
              className={`btn text-sm ${sessionActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-accent'}`}
            >
              {toggling ? '...' : sessionActive ? '⏹ Arrêter la session' : '▶ Lancer la session'}
            </button>
          )}
        </div>
      </div>

      {sessionActive && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">Session en cours</span>
          {combatActive && (
            <>
              <span className="mx-1 text-gray-400">•</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">Combat actif</span>
            </>
          )}
        </div>
      )}
      {!sessionActive && !isMJ && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">En attente du lancement de la session par le MJ</span>
        </div>
      )}

      {/* Sac de Lug */}
      {showInventory && (
        <div className="mb-6">
          <CampaignInventoryPanel
            key={inventoryKey}
            campaignId={campaignId}
            isMJ={isMJ}
            combatActive={combatActive}
            currentUserId={user?.id}
            characters={characters}
            onClose={() => setShowInventory(false)}
          />
        </div>
      )}

      {/* Combat tracker */}
      {combatActive && combatState && (
        <div className="mb-6">
          <CombatTracker
            campaignId={campaignId}
            combatState={combatState}
            isMJ={isMJ}
            onNextTurn={nextTurn}
            onEndCombat={endCombat}
            onAddParticipant={addParticipant}
            onUpdateHp={updateHp}
          />
        </div>
      )}

      {/* 3-column layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Character cards / Monster list */}
        <div className="lg:col-span-3 space-y-3">
          {/* MJ tabs */}
          {isMJ && (
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(201,162,39,0.4)' }}>
              <button
                onClick={() => setMjTab('players')}
                className="flex-1 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: mjTab === 'players' ? 'rgba(124,58,14,0.85)' : 'transparent',
                  color: mjTab === 'players' ? '#f5e6c8' : '#7c3a0e',
                  fontFamily: "'Cinzel', serif",
                }}
              >
                👤 Joueurs ({characters.length})
              </button>
              <button
                onClick={() => setMjTab('monsters')}
                className="flex-1 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: mjTab === 'monsters' ? 'rgba(124,58,14,0.85)' : 'transparent',
                  color: mjTab === 'monsters' ? '#f5e6c8' : '#7c3a0e',
                  fontFamily: "'Cinzel', serif",
                }}
              >
                👹 Monstres ({activeMonsterIds.size}/{monsters.length})
              </button>
            </div>
          )}

          {/* Players tab */}
          {(!isMJ || mjTab === 'players') && (
            <>
              {!isMJ && (
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Personnages ({characters.length})
                </h2>
              )}
              {characters.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun personnage dans cette campagne.</p>
              ) : (
                characters.map((c) => (
                  <CharacterSessionCard
                    key={c.id}
                    character={c}
                    isMJ={isMJ}
                    onWalletChange={handleWalletChange}
                    onOpenDetail={(id) => setDrawerDetail(id)}
                    onOpenSpells={(id) => setDrawerSpells(id)}
                    onOpenSkills={(id) => setDrawerSkills(id)}
                    onOpenInventory={(id) => setDrawerInventory(id)}
                  />
                ))
              )}
            </>
          )}

          {/* Monsters tab (MJ only) */}
          {isMJ && mjTab === 'monsters' && (
            <>
              {monsters.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun monstre dans cette campagne.</p>
              ) : (
                monsters.map((m) => {
                  const isActive = activeMonsterIds.has(m.id)
                  return (
                    <div key={m.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => setActiveMonsterIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(m.id)) { next.delete(m.id) } else { next.add(m.id) }
                            return next
                          })}
                          className="text-[10px] px-2 py-0.5 rounded-full border transition-colors shrink-0"
                          style={{
                            borderColor: 'rgba(201,162,39,0.5)',
                            background: isActive ? 'rgba(124,58,14,0.15)' : 'transparent',
                            color: isActive ? '#7c3a0e' : '#a0845c',
                          }}
                        >
                          {isActive ? '● En jeu' : '○ Hors jeu'}
                        </button>
                      </div>
                      <MonsterSessionCard
                        monster={m}
                        onUpdated={(updated) =>
                          setMonsters((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                        }
                      />
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>

        {/* Center: Chat — sticky full height */}
        <div className="lg:col-span-5 lg:sticky lg:top-0 lg:h-screen lg:py-0 flex flex-col">
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

      {/* Sidebar drawer for quick spell/item access (players only) */}
      {!isMJ && (
        <SessionSidebar
          campaignId={campaignId}
          characterId={myCharacterId}
          onRoll={sendMessage}
        />
      )}

      {/* Character drawers */}
      <CharacterDetailDrawer
        isOpen={drawerDetail !== null}
        onClose={() => setDrawerDetail(null)}
        character={characters.find((c) => c.id === drawerDetail) ?? null}
        isMJ={isMJ}
      />
      <CharacterSpellsDrawer
        isOpen={drawerSpells !== null}
        onClose={() => setDrawerSpells(null)}
        characterId={drawerSpells}
        characterName={characters.find((c) => c.id === drawerSpells)?.name ?? ''}
        isMJ={isMJ}
        campaignId={campaignId}
        onRoll={sendMessage}
      />
      <CharacterSkillsDrawer
        isOpen={drawerSkills !== null}
        onClose={() => setDrawerSkills(null)}
        characterId={drawerSkills}
        characterName={characters.find((c) => c.id === drawerSkills)?.name ?? ''}
        isMJ={isMJ}
        campaignId={campaignId}
      />
      <CharacterInventoryDrawer
        isOpen={drawerInventory !== null}
        onClose={() => setDrawerInventory(null)}
        characterId={drawerInventory}
        characterName={characters.find((c) => c.id === drawerInventory)?.name ?? ''}
        isMJ={isMJ}
        combatActive={combatActive}
        campaignId={campaignId}
        characters={characters}
        currentUserId={user?.id}
        onRoll={sendMessage}
        onInventoryChanged={() => setInventoryKey((k) => k + 1)}
      />
    </div>
  )
}
