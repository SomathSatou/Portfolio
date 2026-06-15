import { Bell, Flag, Gamepad2, User, Users } from 'lucide-react'
import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import CampaignCard from './CampaignCard'
import CharacterCard from './CharacterCard'
import DashboardCard from './DashboardCard'
import NotificationList from './NotificationList'
import type { Campaign, Character, Notification } from './types'

// ─── Mini-game config per class ──────────────────────────────────────────────

interface MiniGame {
  key: string
  label: string
  icon: string
  classTypes: string[]
  hash?: string
  summary: (chars: Character[]) => string
}

const MINI_GAMES: MiniGame[] = [
  {
    key: 'marchand',
    label: 'Comptoir commercial',
    icon: 'M12 3v17.25m0 0c1.472 0 2.882.265 4.185.75M12 20.25c-1.472 0-2.882.265-4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z',
    classTypes: ['marchand'],
    hash: '#/jdr/merchant',
    summary: () => 'Gérez vos commandes commerciales',
  },
  {
    key: 'cultivateur',
    label: 'Jardin alchimique',
    icon: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z',
    classTypes: ['alchimiste', 'cultivateur'],
    summary: () => 'Cultivez vos plantes alchimiques',
  },
  {
    key: 'enchanteur',
    label: 'Atelier de runes',
    icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42',
    classTypes: ['enchanteur'],
    summary: () => 'Dessinez et soumettez vos runes',
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [characters, setCharacters] = React.useState<Character[]>([])
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(true)

  const isMJ = user?.role === 'mj'

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      api.get<Campaign[]>('/campaigns/'),
      api.get<Character[]>('/characters/'),
      api.get<Notification[]>('/notifications/'),
    ])
      .then(([campRes, charRes, notifRes]) => {
        if (cancelled) return
        setCampaigns(campRes.data)
        setCharacters(charRes.data)
        setNotifications(notifRes.data)
      })
      .catch(() => {
        // silent — individual sections handle empty state
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read/`)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch {
      // silent
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all/')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div>
          <div className="skeleton h-8 w-64 mb-2 opacity-50" />
          <div className="skeleton h-4 w-40 opacity-50" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="card-glass p-5 space-y-3">
              <div className="skeleton h-6 w-48" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="skeleton h-20 rounded-xl" />
                <div className="skeleton h-20 rounded-xl" />
              </div>
            </div>
            <div className="card-glass p-5 space-y-3">
              <div className="skeleton h-6 w-40" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="skeleton h-24 rounded-xl" />
                <div className="skeleton h-24 rounded-xl" />
              </div>
            </div>
          </div>
          <div>
            <div className="card-glass p-5 space-y-3">
              <div className="skeleton h-6 w-36" />
              <div className="skeleton h-12 rounded-lg" />
              <div className="skeleton h-12 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Player characters + their classes for mini-game filtering
  const myCharacters = characters.filter((c) => c.player === user?.id)
  const myClasses = new Set(myCharacters.map((c) => c.class_type.toLowerCase()))

  // Mini-games available for this player
  const availableMiniGames = MINI_GAMES.filter((mg) =>
    mg.classTypes.some((ct) => myClasses.has(ct)),
  )

  const unreadNotifs = notifications.filter((n) => !n.is_read)

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="title-medieval text-2xl">
          Bienvenue, {user?.username}
        </h1>
        <p className="mt-1 text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
          {isMJ ? 'Maître du Jeu' : 'Aventurier'} — {campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}, {myCharacters.length} personnage{myCharacters.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Characters + Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Characters */}
          <DashboardCard
            title="Mes Personnages"
            icon={<User className="w-5 h-5" />}
            action={
              <a href="#/jdr/character/new" className="btn-medieval text-xs py-1 px-3">
                + Créer
              </a>
            }
          >
            {myCharacters.length === 0 ? (
              <p className="text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>Aucun personnage pour le moment.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 stagger-children">
                {myCharacters.map((c) => (
                  <CharacterCard key={c.id} character={c} />
                ))}
              </div>
            )}
          </DashboardCard>

          {/* My Campaigns */}
          <DashboardCard
            title="Mes Campagnes"
            icon={<Flag className="w-5 h-5" />}
          >
            {campaigns.length === 0 ? (
              <p className="text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>Aucune campagne active.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 stagger-children">
                {campaigns.map((c) => (
                  <CampaignCard key={c.id} campaign={c} />
                ))}
              </div>
            )}
          </DashboardCard>

          {/* Mini-games inter-session */}
          {(availableMiniGames.length > 0 || isMJ) && (
            <DashboardCard
              title="Mini-jeux inter-session"
              icon={<Gamepad2 className="w-5 h-5" />}
            >
              {isMJ ? (
                // MJ sees a summary of all mini-games for all players
                <div className="space-y-3">
                  <p className="text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
                    Vue d'ensemble de tous les mini-jeux (à venir avec les modules Marchand, Cultivateur, Enchanteur).
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {MINI_GAMES.map((mg) => (
                      <div key={mg.key} className="card-parchment p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4" style={{ color: '#c9a227' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={mg.icon} />
                          </svg>
                          <span className="text-sm" style={{ fontFamily: "'Cinzel', serif", color: '#7c3a0e' }}>{mg.label}</span>
                        </div>
                        <p className="text-xs" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>Module à venir</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableMiniGames.map((mg) => {
                    const content = (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5" style={{ color: '#c9a227' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={mg.icon} />
                          </svg>
                          <span className="font-medium" style={{ fontFamily: "'Cinzel', serif", color: '#7c3a0e' }}>{mg.label}</span>
                        </div>
                        <p className="text-xs" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>{mg.summary(myCharacters)}</p>
                      </>
                    )
                    return mg.hash ? (
                      <a key={mg.key} href={mg.hash} className="card-parchment p-4 no-underline block">
                        {content}
                      </a>
                    ) : (
                      <div key={mg.key} className="card-parchment p-4">
                        {content}
                      </div>
                    )
                  })}
                </div>
              )}
            </DashboardCard>
          )}

          {/* MJ Section: Player Overview */}
          {isMJ && (
            <DashboardCard
              title="Vue d'ensemble des joueurs"
              icon={<Users className="w-5 h-5" />}
            >
              {characters.length === 0 ? (
                <p className="text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>Aucun personnage dans vos campagnes.</p>
              ) : (
                <div className="space-y-3">
                  {characters.filter((c) => c.player !== user?.id).map((c) => (
                    <a
                      key={c.id}
                      href={`#/jdr/character/${c.id}`}
                      className="flex items-center gap-3 p-2 rounded no-underline transition-colors"
                      style={{ borderLeft: '2px solid transparent' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = '#c9a227'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,162,39,0.08)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(201,162,39,0.15)', color: '#c9a227', fontFamily: "'Cinzel', serif" }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium" style={{ fontFamily: "'Cinzel', serif", color: '#7c3a0e' }}>{c.name}</span>
                        <span className="text-xs ml-2" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
                          ({c.player_name}) — {c.class_type || 'Classe inconnue'} Niv.{c.level}
                        </span>
                      </div>
                      <span className="badge text-[10px]" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem' }}>{c.campaign_name}</span>
                    </a>
                  ))}
                  {characters.filter((c) => c.player !== user?.id).length === 0 && (
                    <p className="text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>Aucun joueur dans vos campagnes.</p>
                  )}
                </div>
              )}
            </DashboardCard>
          )}
        </div>

        {/* Right column: Notifications */}
        <div className="flex flex-col">
          <DashboardCard
            title="Notifications"
            icon={<Bell className="w-5 h-5" />}
            action={
              unreadNotifs.length > 0 ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent3 text-[10px] font-bold text-gray-900">
                  {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
                </span>
              ) : undefined
            }
          >
            <NotificationList
              notifications={notifications.slice(0, 20)}
              onMarkAllRead={handleMarkAllRead}
              onMarkRead={handleMarkRead}
            />
          </DashboardCard>
        </div>
      </div>
    </div>
  )
}
