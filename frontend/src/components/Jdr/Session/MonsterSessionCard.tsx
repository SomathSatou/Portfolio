import React from 'react'
import api from '../api'
import type { Monster } from '../Dashboard/types'

interface Props {
  monster: Monster
  onUpdated: (updated: Monster) => void
}

export default function MonsterSessionCard({ monster, onUpdated }: Props) {
  const [expanded, setExpanded] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Editable fields
  const [hp, setHp] = React.useState(monster.hp)
  const [ac, setAc] = React.useState(monster.armor_class)
  const [attack, setAttack] = React.useState(monster.attack)
  const [damage, setDamage] = React.useState(monster.damage)
  const [cr, setCr] = React.useState(monster.challenge_rating)
  const [mtype, setMtype] = React.useState(monster.monster_type)
  const [specialAbilities, setSpecialAbilities] = React.useState(monster.special_abilities)
  const [description, setDescription] = React.useState(monster.description)

  React.useEffect(() => {
    setHp(monster.hp)
    setAc(monster.armor_class)
    setAttack(monster.attack)
    setDamage(monster.damage)
    setCr(monster.challenge_rating)
    setMtype(monster.monster_type)
    setSpecialAbilities(monster.special_abilities)
    setDescription(monster.description)
  }, [monster])

  const hpPct = monster.max_hp > 0 ? Math.min(100, Math.round((hp / monster.max_hp) * 100)) : 0
  const hpColor = hpPct > 60 ? 'bg-green-500' : hpPct > 30 ? 'bg-yellow-500' : 'bg-red-500'

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.patch<Monster>(`/monsters/${monster.id}/`, {
        hp,
        armor_class: ac,
        attack,
        damage,
        challenge_rating: cr,
        monster_type: mtype,
        special_abilities: specialAbilities,
        description,
      })
      onUpdated(res.data)
      setEditing(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setHp(monster.hp)
    setAc(monster.armor_class)
    setAttack(monster.attack)
    setDamage(monster.damage)
    setCr(monster.challenge_rating)
    setMtype(monster.monster_type)
    setSpecialAbilities(monster.special_abilities)
    setDescription(monster.description)
    setEditing(false)
  }

  return (
    <div
      className="rounded-xl border shadow-sm overflow-hidden"
      style={{ background: 'var(--parchment-panel-bg, #f5e6c8)', borderColor: 'rgba(201,162,39,0.45)' }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold truncate" style={{ fontFamily: "'Cinzel', serif", color: '#7c3a0e' }}>
              {monster.name}
            </span>
            {monster.monster_type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(201,162,39,0.2)', color: '#7c3a0e' }}>
                {monster.monster_type}
              </span>
            )}
          </div>
          {monster.challenge_rating && (
            <p className="text-xs mt-0.5" style={{ color: '#a0845c' }}>
              CR {monster.challenge_rating}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium" style={{ color: '#7c3a0e' }}>AC {monster.armor_class}</p>
          <p className="text-xs" style={{ color: '#a0845c' }}>PV {hp}/{monster.max_hp}</p>
        </div>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          style={{ color: '#a0845c' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* HP bar */}
      <div className="px-4 pb-2">
        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${hpColor}`} style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(201,162,39,0.3)' }}>
          {!editing ? (
            <>
              <div className="pt-3 grid grid-cols-2 gap-2 text-xs" style={{ color: '#5c3317' }}>
                {monster.attack && (
                  <div><span className="font-semibold">Attaque :</span> {monster.attack}</div>
                )}
                {monster.damage && (
                  <div><span className="font-semibold">Dégâts :</span> {monster.damage}</div>
                )}
              </div>
              {monster.description && (
                <p className="text-xs" style={{ color: '#5c3317', fontFamily: "'IM Fell English', serif", fontStyle: 'italic' }}>
                  {monster.description}
                </p>
              )}
              {monster.special_abilities && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#7c3a0e' }}>Capacités spéciales</p>
                  <p className="text-xs" style={{ color: '#5c3317' }}>{monster.special_abilities}</p>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true) }}
                className="mt-2 text-xs px-3 py-1 rounded-lg border transition-colors"
                style={{ borderColor: 'rgba(201,162,39,0.5)', color: '#7c3a0e', background: 'rgba(201,162,39,0.1)' }}
              >
                ✏️ Modifier
              </button>
            </>
          ) : (
            <div className="pt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium" style={{ color: '#a0845c' }}>PV max</span>
                  <input
                    type="number" min={0} value={hp}
                    onChange={(e) => setHp(Number(e.target.value))}
                    className="rounded border px-2 py-1 text-xs"
                    style={{ borderColor: 'rgba(201,162,39,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3d1a00' }}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium" style={{ color: '#a0845c' }}>Classe d'armure</span>
                  <input
                    type="number" min={0} value={ac}
                    onChange={(e) => setAc(Number(e.target.value))}
                    className="rounded border px-2 py-1 text-xs"
                    style={{ borderColor: 'rgba(201,162,39,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3d1a00' }}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium" style={{ color: '#a0845c' }}>Attaque</span>
                  <input
                    type="text" value={attack}
                    onChange={(e) => setAttack(e.target.value)}
                    className="rounded border px-2 py-1 text-xs"
                    style={{ borderColor: 'rgba(201,162,39,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3d1a00' }}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium" style={{ color: '#a0845c' }}>Dégâts</span>
                  <input
                    type="text" value={damage}
                    onChange={(e) => setDamage(e.target.value)}
                    className="rounded border px-2 py-1 text-xs"
                    style={{ borderColor: 'rgba(201,162,39,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3d1a00' }}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium" style={{ color: '#a0845c' }}>CR</span>
                  <input
                    type="text" value={cr}
                    onChange={(e) => setCr(e.target.value)}
                    className="rounded border px-2 py-1 text-xs"
                    style={{ borderColor: 'rgba(201,162,39,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3d1a00' }}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium" style={{ color: '#a0845c' }}>Type</span>
                  <input
                    type="text" value={mtype}
                    onChange={(e) => setMtype(e.target.value)}
                    className="rounded border px-2 py-1 text-xs"
                    style={{ borderColor: 'rgba(201,162,39,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3d1a00' }}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium" style={{ color: '#a0845c' }}>Description</span>
                <textarea
                  rows={2} value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded border px-2 py-1 text-xs resize-none"
                  style={{ borderColor: 'rgba(201,162,39,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3d1a00' }}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium" style={{ color: '#a0845c' }}>Capacités spéciales</span>
                <textarea
                  rows={2} value={specialAbilities}
                  onChange={(e) => setSpecialAbilities(e.target.value)}
                  className="rounded border px-2 py-1 text-xs resize-none"
                  style={{ borderColor: 'rgba(201,162,39,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3d1a00' }}
                />
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave} disabled={saving}
                  className="flex-1 text-xs py-1 rounded-lg font-medium"
                  style={{ background: 'rgba(124,58,14,0.85)', color: '#f5e6c8' }}
                >
                  {saving ? '…' : '✓ Sauvegarder'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 text-xs py-1 rounded-lg border"
                  style={{ borderColor: 'rgba(201,162,39,0.4)', color: '#7c3a0e' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
