import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import CampaignBestiaryPanel from './CampaignBestiaryPanel'
import CampaignSettingsPanel from './CampaignSettingsPanel'
import CampaignCitiesPanel from './CampaignCitiesPanel'
import CampaignEventsPanel from './CampaignEventsPanel'
import CampaignItemsPanel from './CampaignItemsPanel'
import CampaignSpellsPanel from './CampaignSpellsPanel'
import CampaignStatsPanel from './CampaignStatsPanel'
import CharacterCard from './CharacterCard'
import type { Campaign, CampaignMember, Character } from './types'

interface CampaignPageProps {
  campaignId: string
}

export default function CampaignPage({ campaignId }: CampaignPageProps) {
  const { user } = useAuth()
  const [campaign, setCampaign] = React.useState<Campaign | null>(null)
  const [characters, setCharacters] = React.useState<Character[]>([])
  const [members, setMembers] = React.useState<CampaignMember[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // Edit state for MJ
  const [editing, setEditing] = React.useState(false)
  const [editName, setEditName] = React.useState('')
  const [editDesc, setEditDesc] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  // Invite state
  const [inviteCode, setInviteCode] = React.useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = React.useState(false)

  // Advance session
  const [advanceLoading, setAdvanceLoading] = React.useState(false)
  const [confirmAdvance, setConfirmAdvance] = React.useState(false)

  // Tabs
  const [activeTab, setActiveTab] = React.useState<'overview' | 'events' | 'cities' | 'spells' | 'items' | 'stats' | 'bestiary' | 'settings'>('overview')

  const isMJ = campaign?.game_master === user?.id

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([
      api.get<Campaign>(`/campaigns/${campaignId}/`),
      api.get<Character[]>(`/campaigns/${campaignId}/characters/`),
      api.get<CampaignMember[]>(`/campaigns/${campaignId}/members/`),
    ])
      .then(([campRes, charRes, memberRes]) => {
        if (cancelled) return
        setCampaign(campRes.data)
        setCharacters(charRes.data)
        setMembers(memberRes.data)
        setEditName(campRes.data.name)
        setEditDesc(campRes.data.description)
        setInviteCode(campRes.data.invite_code)
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger la campagne.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [campaignId])

  const handleSave = async () => {
    if (!campaign) return
    setSaving(true)
    try {
      const res = await api.patch<Campaign>(`/campaigns/${campaign.id}/`, {
        name: editName,
        description: editDesc,
      })
      setCampaign(res.data)
      setEditing(false)
    } catch {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!campaign) return
    setInviteLoading(true)
    try {
      const res = await api.post<{ invite_code: string }>(`/campaigns/${campaign.id}/invite/`)
      setInviteCode(res.data.invite_code)
    } catch {
      setError("Erreur lors de la génération du code d'invitation.")
    } finally {
      setInviteLoading(false)
    }
  }

  const handleAdvanceSession = async () => {
    if (!campaign) return
    setAdvanceLoading(true)
    try {
      const res = await api.post<{ current_session_number: number }>(
        `/campaigns/${campaign.id}/advance-session/`,
      )
      setCampaign({ ...campaign, current_session_number: res.data.current_session_number })
      setConfirmAdvance(false)
    } catch {
      setError("Erreur lors de l'avancement de session.")
    } finally {
      setAdvanceLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>
    )
  }

  if (error && !campaign) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500">{error}</p>
        <a href="#/jdr/dashboard" className="btn btn-outline mt-4">Retour au dashboard</a>
      </div>
    )
  }

  if (!campaign) return null

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <a href="#/jdr/dashboard" className="hover:underline">Dashboard</a>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">{campaign.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          {editing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-2xl font-bold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-primary dark:text-primaryLight focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
                  {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
                <button onClick={() => setEditing(false)} className="btn btn-outline text-sm">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">{campaign.name}</h1>
                <span className="badge">Session #{campaign.current_session_number}</span>
              </div>
              {campaign.description && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">{campaign.description}</p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                MJ : {campaign.game_master_name} — {campaign.member_count} joueur{campaign.member_count !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <a href={`#/jdr/campaign/${campaignId}/session`} className="btn btn-primary text-sm">
              🎮 Session en direct
            </a>
            {isMJ && (
              <>
                <button onClick={() => setEditing(true)} className="btn btn-outline text-sm">
                  Modifier
                </button>
                {!confirmAdvance ? (
                  <button onClick={() => setConfirmAdvance(true)} className="btn btn-accent text-sm">
                    Avancer la session
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Confirmer ?</span>
                    <button
                      onClick={handleAdvanceSession}
                      disabled={advanceLoading}
                      className="btn btn-accent text-sm"
                    >
                      {advanceLoading ? '…' : 'Oui'}
                    </button>
                    <button onClick={() => setConfirmAdvance(false)} className="btn btn-outline text-sm">
                      Non
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {(['overview', 'events', 'cities', 'spells', 'items', 'stats', ...(isMJ ? ['bestiary' as const] : []), 'settings' as const] as const).map((tab) => {
          const labels: Record<string, string> = { overview: 'Vue d\'ensemble', events: '\u00c9v\u00e9nements', cities: 'Villes', spells: 'Sorts', items: 'Objets', stats: 'Statistiques', bestiary: 'Bestiaire', settings: 'Paramètres' }
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary dark:border-primaryLight dark:text-primaryLight'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {labels[tab]}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Characters */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-primary dark:text-primaryLight mb-3">
              Personnages ({characters.length})
            </h2>
            {characters.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun personnage dans cette campagne.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {characters.map((char) => (
                  <CharacterCard key={char.id} character={char} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Members + Invite */}
          <aside className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-primary dark:text-primaryLight mb-3">
                Membres ({members.length})
              </h3>
              {members.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun membre.</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <div className="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-xs font-bold text-primary dark:text-primaryLight">
                        {m.player_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-900 dark:text-gray-100">{m.player_name}</span>
                    </li>
                  ))}
                </ul>
              )}

              {isMJ && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {inviteCode ? (
                    <div className="space-y-2">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">Code d'invitation :</span>
                        <code className="text-sm font-mono text-primary dark:text-primaryLight select-all">
                          {inviteCode}
                        </code>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(inviteCode)}
                          className="btn btn-outline text-xs flex-1"
                        >
                          Copier
                        </button>
                        <button onClick={handleInvite} disabled={inviteLoading} className="btn btn-outline text-xs flex-1">
                          {inviteLoading ? '…' : 'Régénérer'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={handleInvite} disabled={inviteLoading} className="btn btn-outline text-xs w-full">
                      {inviteLoading ? 'Génération…' : 'Générer un code d\'invitation'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'events' && (
        <CampaignEventsPanel campaignId={campaign.id} />
      )}

      {activeTab === 'cities' && (
        <CampaignCitiesPanel campaignId={campaign.id} isMJ={isMJ} />
      )}

      {activeTab === 'spells' && (
        <CampaignSpellsPanel campaignId={campaign.id} isMJ={isMJ} />
      )}

      {activeTab === 'items' && (
        <CampaignItemsPanel campaignId={campaign.id} isMJ={isMJ} />
      )}

      {activeTab === 'stats' && (
        <CampaignStatsPanel campaignId={campaign.id} isMJ={isMJ} />
      )}

      {activeTab === 'bestiary' && (
        <CampaignBestiaryPanel campaignId={campaign.id} isMJ={isMJ} />
      )}

      {activeTab === 'settings' && (
        <CampaignSettingsPanel campaignId={campaign.id} isMJ={isMJ} />
      )}
    </div>
  )
}
