import React from 'react'
import api from '../api'
import type { CampaignEvent } from './types'

const EVENT_TYPE_LABELS: Record<string, string> = {
  order: '🛒 Commerce',
  join: '👋 Nouveau membre',
  advance: '⏩ Session',
  rune_submit: '🔮 Rune soumise',
  rune_review: '✅ Rune validée',
  harvest: '🌿 Récolte',
  character_create: '🧙 Personnage',
  item_give: '🎁 Objet',
  spell_learn: '📖 Sort',
  other: '📌 Autre',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  order: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  join: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  advance: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  rune_submit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  rune_review: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  harvest: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  character_create: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  item_give: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  spell_learn: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
}

const ALL_TYPES = Object.keys(EVENT_TYPE_LABELS)

interface Props {
  campaignId: number
}

export default function CampaignEventsPanel({ campaignId }: Props) {
  const [events, setEvents] = React.useState<CampaignEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filterType, setFilterType] = React.useState('')

  const fetchEvents = React.useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterType) params.type = filterType
      const res = await api.get<CampaignEvent[]>(`/campaigns/${campaignId}/events/`, { params })
      setEvents(res.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [campaignId, filterType])

  React.useEffect(() => { fetchEvents() }, [fetchEvents])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            filterType === ''
              ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Tous
        </button>
        {ALL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              filterType === type
                ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {EVENT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Event list */}
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Chargement…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Aucun événement.</p>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="card flex items-start gap-3 py-3 px-4"
            >
              {/* Badge */}
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_COLORS[ev.event_type] ?? EVENT_TYPE_COLORS.other}`}>
                {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">{ev.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                  {ev.actor_name && <span className="font-medium">{ev.actor_name}</span>}
                  {ev.actor_name && ' — '}
                  {formatDate(ev.created_at)}
                </p>
              </div>

              {/* Navigation link */}
              {ev.link_hash && (
                <a
                  href={ev.link_hash}
                  className="shrink-0 text-xs text-primary dark:text-primaryLight hover:underline"
                >
                  Voir →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
