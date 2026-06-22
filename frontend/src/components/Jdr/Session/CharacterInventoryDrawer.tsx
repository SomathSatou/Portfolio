import React from 'react'
import api from '../api'
import type { CharacterItem, CharacterWithStats } from '../Dashboard/types'
import DiceText from './DiceText'

interface Props {
  isOpen: boolean
  onClose: () => void
  characterId: number | null
  characterName: string
  isMJ: boolean
  combatActive: boolean
  campaignId: string | number
  characters: CharacterWithStats[]
  currentUserId?: number
  onRoll: (cmd: string) => void
  onInventoryChanged?: () => void
}

function rarityColor(rarity: string): string {
  const r = rarity.toLowerCase()
  if (r === 'commun') return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  if (r === 'peu_commun' || r === 'peu commun') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  if (r === 'rare') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  if (r.includes('rare')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  if (r === 'légendaire') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

export default function CharacterInventoryDrawer({
  isOpen, onClose, characterId, characterName, isMJ, combatActive, campaignId,
  characters, currentUserId, onRoll, onInventoryChanged,
}: Props) {
  const [items, setItems] = React.useState<CharacterItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [menuOpenId, setMenuOpenId] = React.useState<number | null>(null)
  const [actionType, setActionType] = React.useState<'give' | 'bag' | null>(null)
  const [transferring, setTransferring] = React.useState<number | null>(null)
  const [error, setError] = React.useState('')
  const menuRef = React.useRef<HTMLDivElement>(null)

  const isOwner = characters.find((c) => c.id === characterId)?.player === currentUserId

  const fetchItems = React.useCallback(async () => {
    if (!characterId) return
    setLoading(true)
    try {
      const res = await api.get<CharacterItem[]>(`/character-items/?character=${characterId}`)
      setItems(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [characterId])

  React.useEffect(() => {
    if (isOpen) fetchItems()
  }, [isOpen, fetchItems])

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
        setActionType(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const canEdit = isMJ || isOwner

  const handleToggleEquip = async (item: CharacterItem) => {
    try {
      await api.patch(`/character-items/${item.id}/`, { is_equipped: !item.is_equipped })
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_equipped: !i.is_equipped } : i))
    } catch { /* ignore */ }
    setMenuOpenId(null)
  }

  const handleSendToBag = async (item: CharacterItem) => {
    if (combatActive && !isMJ) return
    setTransferring(item.id)
    setError('')
    try {
      await api.post(`/campaigns/${campaignId}/inventory/transfer/`, {
        item_id: item.item,
        quantity: 1,
        from_type: 'character',
        from_character_id: characterId,
        to_type: 'campaign',
      })
      await fetchItems()
      onInventoryChanged?.()
    } catch {
      setError('Erreur lors du transfert.')
    } finally {
      setTransferring(null)
      setMenuOpenId(null)
      setActionType(null)
    }
  }

  const handleGiveTo = async (item: CharacterItem, toCharId: number) => {
    if (combatActive && !isMJ) return
    setTransferring(item.id)
    setError('')
    try {
      await api.post(`/campaigns/${campaignId}/inventory/transfer/`, {
        item_id: item.item,
        quantity: 1,
        from_type: 'character',
        from_character_id: characterId,
        to_type: 'character',
        to_character_id: toCharId,
      })
      await fetchItems()
      onInventoryChanged?.()
    } catch {
      setError('Erreur lors du transfert.')
    } finally {
      setTransferring(null)
      setMenuOpenId(null)
      setActionType(null)
    }
  }

  const handleDelete = async (item: CharacterItem) => {
    if (!isMJ) return
    try {
      await api.delete(`/character-items/${item.id}/`)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch { /* ignore */ }
    setMenuOpenId(null)
  }

  const otherCharacters = characters.filter((c) => c.id !== characterId)

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-[480px] max-w-[95vw] shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--parchment-panel-bg, #f5e6c8)', borderRight: '1px solid rgba(201,162,39,0.5)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(201,162,39,0.4)' }}>
          <h2 className="font-semibold text-primary dark:text-primaryLight">
            🎒 Inventaire — {characterName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>}

          {!loading && items.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Inventaire vide.</p>
          )}

          {!loading && items.map((ci) => (
            <div key={ci.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {ci.item_name}
                      {ci.quantity > 1 && <span className="text-gray-500 font-normal"> ×{ci.quantity}</span>}
                    </h3>
                    {ci.item_rarity && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${rarityColor(ci.item_rarity)}`}>
                        {ci.item_rarity}
                      </span>
                    )}
                    {ci.is_equipped && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Équipé
                      </span>
                    )}
                    {ci.item_is_magical && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400">✨</span>
                    )}
                  </div>
                  {ci.item_type && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ci.item_type}</p>
                  )}
                  {ci.item_description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      <DiceText text={ci.item_description} onRoll={onRoll} />
                    </p>
                  )}
                </div>

                {canEdit && (
                  <div className="relative shrink-0" ref={menuOpenId === ci.id ? menuRef : undefined}>
                    <button
                      onClick={() => {
                        setMenuOpenId(menuOpenId === ci.id ? null : ci.id)
                        setActionType(null)
                      }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                      title="Options"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </button>

                    {menuOpenId === ci.id && (
                      <div className="absolute right-0 top-7 z-50 w-48 card shadow-lg border border-gray-200 dark:border-gray-700 p-1 space-y-0.5">
                        <button
                          onClick={() => handleToggleEquip(ci)}
                          className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          {ci.is_equipped ? 'Déséquiper' : 'Équiper'}
                        </button>

                        {(!combatActive || isMJ) && (
                          <>
                            <button
                              onClick={() => handleSendToBag(ci)}
                              disabled={transferring === ci.id}
                              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              {transferring === ci.id ? '…' : '🎒 Envoyer au Sac de Lug'}
                            </button>

                            {otherCharacters.length > 0 && (
                              actionType === 'give' ? (
                                <div className="space-y-0.5">
                                  <p className="text-xs text-gray-500 px-2 pt-1">Donner à :</p>
                                  {otherCharacters.map((c) => (
                                    <button
                                      key={c.id}
                                      onClick={() => handleGiveTo(ci, c.id)}
                                      disabled={transferring === ci.id}
                                      className="w-full text-left text-sm px-2 py-1 rounded hover:bg-primary/10 dark:hover:bg-primary/20"
                                    >
                                      {c.name}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => setActionType(null)}
                                    className="w-full text-left text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setActionType('give')}
                                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  🤝 Donner à…
                                </button>
                              )
                            )}
                          </>
                        )}

                        {isMJ && (
                          <button
                            onClick={() => handleDelete(ci)}
                            className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
