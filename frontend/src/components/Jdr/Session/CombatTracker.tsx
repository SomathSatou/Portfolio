import React from 'react'
import type { CombatParticipant, CombatSession, Monster } from '../Dashboard/types'
import api from '../api'

interface Props {
  campaignId: string | number
  combatState: CombatSession
  isMJ: boolean
  onNextTurn: () => void
  onEndCombat: () => void
  onAddParticipant: (payload: {
    character_id?: number | null
    monster_id?: number | null
    monster_name?: string
    hp?: number
    initiative?: number
  }) => void
  onUpdateHp: (participantId: number, hp: number) => void
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function CombatTracker({
  campaignId, combatState, isMJ, onNextTurn, onEndCombat, onAddParticipant, onUpdateHp,
}: Props) {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [monsters, setMonsters] = React.useState<Monster[]>([])
  const [addMode, setAddMode] = React.useState<'bestiary' | 'adhoc'>('bestiary')
  const [selectedMonsterId, setSelectedMonsterId] = React.useState<number | ''>('')
  const [adhocName, setAdhocName] = React.useState('')
  const [adhocHp, setAdhocHp] = React.useState(20)
  const [adhocInit, setAdhocInit] = React.useState(0)
  const [editingHp, setEditingHp] = React.useState<Record<number, string>>({})
  const [confirmEnd, setConfirmEnd] = React.useState(false)

  React.useEffect(() => {
    if (showAddForm && addMode === 'bestiary') {
      api.get<Monster[]>(`/monsters/?campaign=${campaignId}`)
        .then((res) => setMonsters(res.data))
        .catch(() => {})
    }
  }, [showAddForm, addMode, campaignId])

  const handleAdd = () => {
    if (addMode === 'bestiary' && selectedMonsterId) {
      onAddParticipant({ monster_id: Number(selectedMonsterId) })
    } else if (addMode === 'adhoc' && adhocName.trim()) {
      onAddParticipant({ monster_name: adhocName.trim(), hp: adhocHp, initiative: adhocInit })
    }
    setShowAddForm(false)
    setSelectedMonsterId('')
    setAdhocName('')
    setAdhocHp(20)
    setAdhocInit(0)
  }

  const handleHpEdit = (p: CombatParticipant, val: string) => {
    setEditingHp((prev) => ({ ...prev, [p.id]: val }))
  }

  const handleHpBlur = (p: CombatParticipant) => {
    const val = editingHp[p.id]
    if (val !== undefined) {
      const num = parseInt(val, 10)
      if (!isNaN(num) && num !== p.hp_current) {
        onUpdateHp(p.id, Math.max(0, num))
      }
      setEditingHp((prev) => {
        const next = { ...prev }
        delete next[p.id]
        return next
      })
    }
  }

  const participants = [...combatState.participants].sort((a, b) => a.order_index - b.order_index)
  const currentParticipant = participants[combatState.current_turn_index]

  return (
    <div className="card space-y-4 border-2 border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚔️</span>
          <h3 className="font-bold text-red-700 dark:text-red-400">
            Combat — Tour {combatState.current_turn_index + 1} / Round {combatState.round_number}
          </h3>
        </div>
        {isMJ && (
          <div className="flex gap-2">
            <button
              onClick={onNextTurn}
              className="btn btn-primary text-sm"
            >
              Tour suivant ▶
            </button>
            {!confirmEnd ? (
              <button
                onClick={() => setConfirmEnd(true)}
                className="btn btn-outline text-sm text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
              >
                Terminer
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Confirmer ?</span>
                <button onClick={() => { onEndCombat(); setConfirmEnd(false) }} className="btn text-xs bg-red-600 hover:bg-red-700 text-white">Oui</button>
                <button onClick={() => setConfirmEnd(false)} className="btn btn-outline text-xs">Non</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Participants list */}
      <div className="space-y-2">
        {participants.map((p, idx) => {
          const isCurrent = idx === combatState.current_turn_index
          const hpVal = editingHp[p.id] !== undefined ? editingHp[p.id] : String(p.hp_current)
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-400 dark:ring-yellow-600'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              {/* Turn indicator */}
              <div className={`w-1 h-8 rounded-full shrink-0 ${isCurrent ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-gray-600'}`} />

              {/* Avatar */}
              {p.character_avatar ? (
                <img src={p.character_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  p.is_monster
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primaryLight'
                }`}>
                  {p.is_monster ? '👾' : p.character_name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Name + HP */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {p.character_name || p.monster_name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    p.is_monster
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-primary/20 text-primary dark:bg-primaryLight/20 dark:text-primaryLight'
                  }`}>
                    {p.is_monster ? 'Monstre' : 'PJ'}
                  </span>
                  <span className="text-[10px] text-gray-500">AGI {p.initiative}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 shrink-0">{p.hp_current}/{p.hp_max} PV</span>
                  <div className="flex-1">
                    <HpBar current={p.hp_current} max={p.hp_max} />
                  </div>
                </div>
              </div>

              {/* HP edit (MJ only) */}
              {isMJ && (
                <input
                  type="number"
                  min={0}
                  value={hpVal}
                  onChange={(e) => handleHpEdit(p, e.target.value)}
                  onBlur={() => handleHpBlur(p)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleHpBlur(p) }}
                  className="w-16 text-center text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 py-0.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Add participant */}
      {isMJ && (
        <div>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-outline text-sm w-full"
            >
              + Ajouter un combattant
            </button>
          ) : (
            <div className="space-y-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex gap-2">
                <button
                  onClick={() => setAddMode('bestiary')}
                  className={`flex-1 text-sm py-1 rounded-lg font-medium transition-colors ${
                    addMode === 'bestiary'
                      ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Bestiaire
                </button>
                <button
                  onClick={() => setAddMode('adhoc')}
                  className={`flex-1 text-sm py-1 rounded-lg font-medium transition-colors ${
                    addMode === 'adhoc'
                      ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Ad-hoc
                </button>
              </div>

              {addMode === 'bestiary' ? (
                <select
                  value={selectedMonsterId}
                  onChange={(e) => setSelectedMonsterId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Choisir un monstre…</option>
                  {monsters.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} (PV {m.hp})</option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="Nom *"
                    value={adhocName}
                    onChange={(e) => setAdhocName(e.target.value)}
                    className="col-span-3 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">PV</label>
                    <input
                      type="number"
                      min={1}
                      value={adhocHp}
                      onChange={(e) => setAdhocHp(Math.max(1, +e.target.value))}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">AGI</label>
                    <input
                      type="number"
                      value={adhocInit}
                      onChange={(e) => setAdhocInit(+e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={addMode === 'bestiary' ? !selectedMonsterId : !adhocName.trim()}
                  className="btn btn-primary text-sm flex-1"
                >
                  Ajouter
                </button>
                <button onClick={() => setShowAddForm(false)} className="btn btn-outline text-sm">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current turn indicator */}
      {currentParticipant && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Tour de : <strong className="text-yellow-600 dark:text-yellow-400">
            {currentParticipant.character_name || currentParticipant.monster_name}
          </strong>
        </p>
      )}
    </div>
  )
}
