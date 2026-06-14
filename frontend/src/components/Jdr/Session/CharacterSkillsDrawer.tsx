import React from 'react'
import api from '../api'
import type { CharacterPassiveSkill, CharacterSkill, PassiveSkill, Skill } from '../Dashboard/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  characterId: number | null
  characterName: string
  isMJ: boolean
  campaignId: string | number
}

export default function CharacterSkillsDrawer({
  isOpen, onClose, characterId, characterName, isMJ, campaignId,
}: Props) {
  const [charSkills, setCharSkills] = React.useState<CharacterSkill[]>([])
  const [charPassives, setCharPassives] = React.useState<CharacterPassiveSkill[]>([])
  const [campaignSkills, setCampaignSkills] = React.useState<Skill[]>([])
  const [campaignPassives, setCampaignPassives] = React.useState<PassiveSkill[]>([])
  const [loading, setLoading] = React.useState(false)
  const [tab, setTab] = React.useState<'active' | 'passive'>('active')
  const [addingId, setAddingId] = React.useState<number | null>(null)
  const [removing, setRemoving] = React.useState<number | null>(null)
  const [showAdd, setShowAdd] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    if (!characterId) return
    setLoading(true)
    try {
      const [skRes, psRes, allSkRes, allPsRes] = await Promise.all([
        api.get<CharacterSkill[]>(`/character-skills/?character=${characterId}`),
        api.get<CharacterPassiveSkill[]>(`/character-passive-skills/?character=${characterId}`),
        isMJ ? api.get<Skill[]>(`/skills/?campaign=${campaignId}`) : Promise.resolve({ data: [] as Skill[] }),
        isMJ ? api.get<PassiveSkill[]>(`/passive-skills/?campaign=${campaignId}`) : Promise.resolve({ data: [] as PassiveSkill[] }),
      ])
      setCharSkills(skRes.data)
      setCharPassives(psRes.data)
      setCampaignSkills(allSkRes.data)
      setCampaignPassives(allPsRes.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [characterId, isMJ, campaignId])

  React.useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, fetchData])

  const handleAddSkill = async (skillId: number) => {
    if (!characterId) return
    setAddingId(skillId)
    try {
      await api.post('/character-skills/', { character_id: characterId, skill_id: skillId })
      await fetchData()
      setShowAdd(false)
    } catch { /* ignore */ }
    finally { setAddingId(null) }
  }

  const handleAddPassive = async (passiveId: number) => {
    if (!characterId) return
    setAddingId(passiveId)
    try {
      await api.post('/character-passive-skills/', { character_id: characterId, passive_skill_id: passiveId })
      await fetchData()
      setShowAdd(false)
    } catch { /* ignore */ }
    finally { setAddingId(null) }
  }

  const handleRemoveSkill = async (entryId: number) => {
    setRemoving(entryId)
    try {
      await api.delete(`/character-skills/${entryId}/`)
      setCharSkills((prev) => prev.filter((s) => s.id !== entryId))
    } catch { /* ignore */ }
    finally { setRemoving(null) }
  }

  const handleRemovePassive = async (entryId: number) => {
    setRemoving(entryId)
    try {
      await api.delete(`/character-passive-skills/${entryId}/`)
      setCharPassives((prev) => prev.filter((p) => p.id !== entryId))
    } catch { /* ignore */ }
    finally { setRemoving(null) }
  }

  const learnedSkillIds = new Set(charSkills.map((cs) => cs.skill))
  const learnedPassiveIds = new Set(charPassives.map((cp) => cp.passive_skill))
  const availableSkills = campaignSkills.filter((s) => !learnedSkillIds.has(s.id))
  const availablePassives = campaignPassives.filter((p) => !learnedPassiveIds.has(p.id))

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-[480px] max-w-[95vw] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="font-semibold text-primary dark:text-primaryLight">
            ⚔️ Compétences — {characterName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {(['active', 'passive'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setShowAdd(false) }}
              className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary dark:border-primaryLight dark:text-primaryLight'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'active' ? `Actives (${charSkills.length})` : `Passives (${charPassives.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>}

          {!loading && tab === 'active' && (
            <>
              {charSkills.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucune compétence active.</p>
              )}
              {charSkills.map((cs) => (
                <div key={cs.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{cs.skill_name}</h3>
                        {cs.skill_category && <span className="badge text-[10px]">{cs.skill_category}</span>}
                      </div>
                      {cs.skill_description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{cs.skill_description}</p>
                      )}
                    </div>
                    {isMJ && (
                      <button
                        onClick={() => handleRemoveSkill(cs.id)}
                        disabled={removing === cs.id}
                        className="text-xs text-red-500 hover:underline shrink-0"
                      >
                        {removing === cs.id ? '…' : 'Retirer'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isMJ && !showAdd && availableSkills.length > 0 && (
                <button onClick={() => setShowAdd(true)} className="btn btn-outline text-sm w-full">
                  + Ajouter une compétence
                </button>
              )}
              {isMJ && showAdd && (
                <div className="space-y-2">
                  {availableSkills.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleAddSkill(s.id)}
                      disabled={addingId === s.id}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primaryLight transition-colors text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100">{s.name}</span>
                      {s.category && <span className="text-xs text-gray-500">{s.category}</span>}
                    </button>
                  ))}
                  <button onClick={() => setShowAdd(false)} className="btn btn-outline text-xs w-full">Annuler</button>
                </div>
              )}
            </>
          )}

          {!loading && tab === 'passive' && (
            <>
              {charPassives.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucune compétence passive.</p>
              )}
              {charPassives.map((cp) => (
                <div key={cp.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{cp.passive_skill_name}</h3>
                      {cp.passive_skill_description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{cp.passive_skill_description}</p>
                      )}
                    </div>
                    {isMJ && (
                      <button
                        onClick={() => handleRemovePassive(cp.id)}
                        disabled={removing === cp.id}
                        className="text-xs text-red-500 hover:underline shrink-0"
                      >
                        {removing === cp.id ? '…' : 'Retirer'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isMJ && !showAdd && availablePassives.length > 0 && (
                <button onClick={() => setShowAdd(true)} className="btn btn-outline text-sm w-full">
                  + Ajouter une compétence passive
                </button>
              )}
              {isMJ && showAdd && (
                <div className="space-y-2">
                  {availablePassives.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddPassive(p.id)}
                      disabled={addingId === p.id}
                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primaryLight transition-colors text-sm font-medium text-gray-900 dark:text-gray-100"
                    >
                      {p.name}
                    </button>
                  ))}
                  <button onClick={() => setShowAdd(false)} className="btn btn-outline text-xs w-full">Annuler</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
