import React from 'react'
import api from '../api'
import type { CharacterSpell, Spell } from '../Dashboard/types'
import DiceText from './DiceText'

interface Props {
  isOpen: boolean
  onClose: () => void
  characterId: number | null
  characterName: string
  isMJ: boolean
  campaignId: string | number
  onRoll: (cmd: string) => void
}

export default function CharacterSpellsDrawer({
  isOpen, onClose, characterId, characterName, isMJ, campaignId, onRoll,
}: Props) {
  const [charSpells, setCharSpells] = React.useState<CharacterSpell[]>([])
  const [campaignSpells, setCampaignSpells] = React.useState<Spell[]>([])
  const [loading, setLoading] = React.useState(false)
  const [addingId, setAddingId] = React.useState<number | null>(null)
  const [removing, setRemoving] = React.useState<number | null>(null)
  const [showAdd, setShowAdd] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    if (!characterId) return
    setLoading(true)
    try {
      const [spellsRes, allRes] = await Promise.all([
        api.get<CharacterSpell[]>(`/character-spells/?character=${characterId}`),
        isMJ ? api.get<Spell[]>(`/spells/?campaign=${campaignId}`) : Promise.resolve({ data: [] as Spell[] }),
      ])
      setCharSpells(spellsRes.data)
      setCampaignSpells(allRes.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [characterId, isMJ, campaignId])

  React.useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, fetchData])

  const handleAdd = async (spellId: number) => {
    if (!characterId) return
    setAddingId(spellId)
    try {
      await api.post('/character-spells/', { character: characterId, spell: spellId })
      await fetchData()
      setShowAdd(false)
    } catch { /* ignore */ }
    finally { setAddingId(null) }
  }

  const handleRemove = async (entryId: number) => {
    setRemoving(entryId)
    try {
      await api.delete(`/character-spells/${entryId}/`)
      setCharSpells((prev) => prev.filter((s) => s.id !== entryId))
    } catch { /* ignore */ }
    finally { setRemoving(null) }
  }

  const learnedIds = new Set(charSpells.map((cs) => cs.spell))
  const availableToAdd = campaignSpells.filter((s) => !learnedIds.has(s.id))

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
            ✨ Sorts — {characterName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>}

          {!loading && charSpells.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun sort appris.</p>
          )}

          {!loading && charSpells.map((cs) => (
            <div key={cs.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{cs.spell_name}</h3>
                    <span className="badge text-[10px]">Niv. {cs.spell_level}</span>
                    {cs.spell_school && <span className="badge text-[10px]">{cs.spell_school}</span>}
                    {cs.spell_mana_cost > 0 && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400">Mana: {cs.spell_mana_cost}</span>
                    )}
                  </div>
                  {cs.spell_description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <DiceText text={cs.spell_description} onRoll={onRoll} />
                    </p>
                  )}
                  {cs.spell_damage && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                      Dégâts: <DiceText text={cs.spell_damage} onRoll={onRoll} />
                    </p>
                  )}
                </div>
                {isMJ && (
                  <button
                    onClick={() => handleRemove(cs.id)}
                    disabled={removing === cs.id}
                    className="text-xs text-red-500 hover:underline shrink-0"
                  >
                    {removing === cs.id ? '…' : 'Retirer'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isMJ && !showAdd && availableToAdd.length > 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="btn btn-outline text-sm w-full"
            >
              + Ajouter un sort
            </button>
          )}

          {isMJ && showAdd && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sorts disponibles :</p>
              {availableToAdd.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleAdd(s.id)}
                  disabled={addingId === s.id}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primaryLight transition-colors text-sm"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">{s.name}</span>
                  <span className="text-xs text-gray-500">Niv. {s.level}</span>
                </button>
              ))}
              <button onClick={() => setShowAdd(false)} className="btn btn-outline text-xs w-full">
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
