import React from 'react'
import api from '../api'
import type { CampaignInventoryEntry, CharacterWithStats } from '../Dashboard/types'

interface Props {
  campaignId: string | number
  isMJ: boolean
  combatActive: boolean
  currentUserId?: number
  characters: CharacterWithStats[]
  onClose?: () => void
}

const RARITY_COLORS: Record<string, string> = {
  commun: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  peu_commun: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rare: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'très_rare': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  légendaire: 'bg-accent3/20 text-yellow-800 dark:text-accent3',
  'artéfact': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export default function CampaignInventoryPanel({
  campaignId, isMJ, combatActive, currentUserId, characters, onClose,
}: Props) {
  const [entries, setEntries] = React.useState<CampaignInventoryEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [transferring, setTransferring] = React.useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState<number | null>(null)
  const pickerRef = React.useRef<HTMLDivElement>(null)

  const myCharacter = React.useMemo(
    () => characters.find((c) => c.player === currentUserId) ?? null,
    [characters, currentUserId],
  )

  const fetchEntries = React.useCallback(async () => {
    try {
      const res = await api.get<CampaignInventoryEntry[]>(`/campaigns/${campaignId}/inventory/`)
      setEntries(res.data)
    } catch {
      setError('Impossible de charger le sac de Lug.')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => { fetchEntries() }, [fetchEntries])

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleTake = async (entry: CampaignInventoryEntry, toCharacterId: number) => {
    if (combatActive && !isMJ) return
    setTransferring(entry.id)
    try {
      await api.post(`/campaigns/${campaignId}/inventory/transfer/`, {
        item_id: entry.item,
        quantity: 1,
        from_type: 'campaign',
        to_type: 'character',
        to_character_id: toCharacterId,
      })
      setPickerOpen(null)
      await fetchEntries()
    } catch {
      setError('Erreur lors du transfert.')
    } finally {
      setTransferring(null)
    }
  }

  const handleDelete = async (entry: CampaignInventoryEntry) => {
    if (!isMJ) return
    try {
      await api.delete(`/campaigns/${campaignId}/inventory/`, { data: { entry_id: entry.id } })
      await fetchEntries()
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary dark:text-primaryLight flex items-center gap-2">
          🎒 Sac de Lug
          {combatActive && (
            <span className="text-xs font-normal text-red-500 dark:text-red-400">
              (verrouillé pendant le combat)
            </span>
          )}
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            ✕
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Le sac est vide.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {entry.item_name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${RARITY_COLORS[entry.item_rarity] ?? RARITY_COLORS.commun}`}>
                    {entry.item_rarity}
                  </span>
                  {entry.item_is_magical && (
                    <span className="text-xs text-purple-600 dark:text-purple-400">✨ Magique</span>
                  )}
                </div>
                {entry.item_type && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{entry.item_type}</p>
                )}
              </div>

              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                ×{entry.quantity}
              </span>

              <div className="relative shrink-0" ref={pickerOpen === entry.id ? pickerRef : undefined}>
                {!combatActive || isMJ ? (
                  <button
                    onClick={() => setPickerOpen(pickerOpen === entry.id ? null : entry.id)}
                    disabled={transferring === entry.id}
                    className="btn btn-outline text-xs py-0.5 px-2"
                  >
                    Prendre
                  </button>
                ) : null}

                {pickerOpen === entry.id && (
                  <div className="absolute right-0 top-7 z-50 w-48 card shadow-lg border border-gray-200 dark:border-gray-700 p-1 space-y-1">
                    {isMJ ? (
                      characters.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleTake(entry, c.id)}
                          className="w-full text-left text-sm px-2 py-1 rounded hover:bg-primary/10 dark:hover:bg-primary/20"
                        >
                          {c.name}
                        </button>
                      ))
                    ) : myCharacter ? (
                      <button
                        onClick={() => handleTake(entry, myCharacter.id)}
                        className="w-full text-left text-sm px-2 py-1 rounded hover:bg-primary/10 dark:hover:bg-primary/20"
                      >
                        {myCharacter.name}
                      </button>
                    ) : (
                      <p className="text-xs text-gray-500 px-2 py-1">Aucun personnage</p>
                    )}
                  </div>
                )}
              </div>

              {isMJ && (
                <button
                  onClick={() => handleDelete(entry)}
                  className="text-xs text-red-500 hover:underline shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
