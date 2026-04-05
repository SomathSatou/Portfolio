import React from 'react'
import api from '../api'
import type { CharacterSpell, CharacterItem } from '../Dashboard/types'
import DiceText from './DiceText'

interface Props {
  campaignId: string | number
  characterId: number | null
  onRoll: (diceCommand: string) => void
}

export default function SessionSidebar({ campaignId, characterId, onRoll }: Props) {
  const [open, setOpen] = React.useState(false)
  const [tab, setTab] = React.useState<'spells' | 'items'>('spells')
  const [spells, setSpells] = React.useState<CharacterSpell[]>([])
  const [items, setItems] = React.useState<CharacterItem[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open || !characterId) return
    setLoading(true)
    Promise.all([
      api.get<CharacterSpell[]>(`/character-spells/?character=${characterId}`),
      api.get<CharacterItem[]>(`/character-items/?character=${characterId}`),
    ])
      .then(([spellsRes, itemsRes]) => {
        setSpells(spellsRes.data)
        setItems(itemsRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, characterId, campaignId])

  if (!characterId) return null

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-4 bottom-4 z-40 w-12 h-12 rounded-full bg-primary hover:bg-primary/90 dark:bg-primaryLight dark:hover:bg-primaryLight/90 text-white dark:text-gray-900 shadow-lg flex items-center justify-center transition-colors"
        title="Sorts & Items"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-primary dark:text-primaryLight uppercase tracking-wide">
            Inventaire rapide
          </h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['spells', 'items'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary dark:border-primaryLight dark:text-primaryLight'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'spells' ? `Sorts (${spells.length})` : `Items (${items.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 100px)' }}>
          {loading && <p className="text-sm text-gray-400">Chargement…</p>}

          {!loading && tab === 'spells' && (
            spells.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun sort appris.</p>
            ) : (
              spells.map((cs) => (
                <div key={cs.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{cs.spell_name}</h3>
                    <div className="flex gap-1">
                      <span className="badge text-[10px]">Niv. {cs.spell_level}</span>
                      {cs.spell_school && <span className="badge text-[10px]">{cs.spell_school}</span>}
                    </div>
                  </div>
                  {cs.spell_mana_cost > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Mana: {cs.spell_mana_cost}</p>
                  )}
                  {cs.spell_description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <DiceText text={cs.spell_description} onRoll={onRoll} />
                    </p>
                  )}
                  {cs.notes && (
                    <p className="text-xs text-gray-500 italic">
                      <DiceText text={cs.notes} onRoll={onRoll} />
                    </p>
                  )}
                </div>
              ))
            )
          )}

          {!loading && tab === 'items' && (
            items.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun objet possédé.</p>
            ) : (
              items.map((ci) => (
                <div key={ci.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {ci.item_name}
                      {ci.quantity > 1 && <span className="text-gray-500 font-normal"> ×{ci.quantity}</span>}
                    </h3>
                    <div className="flex gap-1">
                      {ci.item_rarity && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${rarityColor(ci.item_rarity)}`}>
                          {ci.item_rarity}
                        </span>
                      )}
                      {ci.is_equipped && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Équipé
                        </span>
                      )}
                    </div>
                  </div>
                  {ci.item_type && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ci.item_type}</p>
                  )}
                  {ci.item_description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <DiceText text={ci.item_description} onRoll={onRoll} />
                    </p>
                  )}
                  {ci.notes && (
                    <p className="text-xs text-gray-500 italic">
                      <DiceText text={ci.notes} onRoll={onRoll} />
                    </p>
                  )}
                  {ci.item_is_magical && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400">
                      ✨ Magique
                    </span>
                  )}
                </div>
              ))
            )
          )}
        </div>
      </div>
    </>
  )
}

function rarityColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case 'commun': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    case 'peu commun': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'rare': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'très rare': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'légendaire': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'artéfact': return 'bg-accent3/20 text-yellow-800 dark:text-accent3'
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}
