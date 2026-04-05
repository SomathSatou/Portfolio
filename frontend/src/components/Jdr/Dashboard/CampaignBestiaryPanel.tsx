import React from 'react'
import api from '../api'
import type { Monster, Stat } from './types'

interface Props {
  campaignId: number
  isMJ: boolean
}

const EMPTY_FORM = {
  name: '', description: '', hp: 10, armor_class: 10,
  attack: '', damage: '', special_abilities: '',
  challenge_rating: '', monster_type: '',
}

const INPUT_CLS = 'rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary'

export default function CampaignBestiaryPanel({ campaignId, isMJ }: Props) {
  const [monsters, setMonsters] = React.useState<Monster[]>([])
  const [campaignStats, setCampaignStats] = React.useState<Stat[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // Create form
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [formStats, setFormStats] = React.useState<Record<string, number>>({})
  const [saving, setSaving] = React.useState(false)

  // Edit
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [editForm, setEditForm] = React.useState(EMPTY_FORM)
  const [editStats, setEditStats] = React.useState<Record<string, number>>({})

  // Expanded detail
  const [expandedId, setExpandedId] = React.useState<number | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      const [monstersRes, statsRes] = await Promise.all([
        api.get<Monster[]>(`/monsters/?campaign=${campaignId}`),
        api.get<Stat[]>(`/stats/?campaign=${campaignId}`),
      ])
      setMonsters(monstersRes.data)
      setCampaignStats(statsRes.data)
    } catch {
      setError('Impossible de charger le bestiaire.')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/monsters/', { ...form, stats: formStats, campaign: campaignId })
      setForm(EMPTY_FORM)
      setFormStats({})
      setShowForm(false)
      await fetchData()
    } catch {
      setError('Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/monsters/${id}/`)
      setMonsters((prev) => prev.filter((m) => m.id !== id))
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  const startEdit = (monster: Monster) => {
    setEditingId(monster.id)
    setEditForm({
      name: monster.name, description: monster.description,
      hp: monster.hp, armor_class: monster.armor_class,
      attack: monster.attack, damage: monster.damage,
      special_abilities: monster.special_abilities,
      challenge_rating: monster.challenge_rating,
      monster_type: monster.monster_type,
    })
    setEditStats(monster.stats ?? {})
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setSaving(true)
    try {
      await api.patch(`/monsters/${editingId}/`, { ...editForm, stats: editStats })
      setEditingId(null)
      await fetchData()
    } catch {
      setError('Erreur lors de la modification.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

  const renderStatsInputs = (
    statsValues: Record<string, number>,
    setStatsValues: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  ) => (
    campaignStats.length > 0 && (
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Stats de campagne</p>
        <div className="flex flex-wrap gap-2">
          {campaignStats.map((stat) => (
            <div key={stat.id} className="flex items-center gap-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">{stat.name}</label>
              <input
                type="number"
                value={statsValues[String(stat.id)] ?? 0}
                onChange={(e) => setStatsValues((prev) => ({ ...prev, [String(stat.id)]: +e.target.value }))}
                className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-xs text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>
    )
  )

  const renderForm = (
    values: typeof EMPTY_FORM,
    setValues: (v: typeof EMPTY_FORM) => void,
    statsValues: Record<string, number>,
    setStatsValues: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    onSubmit: (e: React.FormEvent) => void,
    submitLabel: string,
  ) => (
    <form onSubmit={onSubmit} className="card space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Nom *" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} className={INPUT_CLS} />
        <input placeholder="Type (bête, dragon…)" value={values.monster_type} onChange={(e) => setValues({ ...values, monster_type: e.target.value })} className={INPUT_CLS} />
        <input type="number" min={1} placeholder="PV" value={values.hp} onChange={(e) => setValues({ ...values, hp: +e.target.value })} className={INPUT_CLS} />
        <input type="number" min={0} placeholder="CA" value={values.armor_class} onChange={(e) => setValues({ ...values, armor_class: +e.target.value })} className={INPUT_CLS} />
        <input placeholder="Attaque (ex: 1d20+5)" value={values.attack} onChange={(e) => setValues({ ...values, attack: e.target.value })} className={INPUT_CLS} />
        <input placeholder="Dégâts (ex: 2d6+3)" value={values.damage} onChange={(e) => setValues({ ...values, damage: e.target.value })} className={INPUT_CLS} />
        <input placeholder="Niveau de défi" value={values.challenge_rating} onChange={(e) => setValues({ ...values, challenge_rating: e.target.value })} className={INPUT_CLS} />
      </div>
      <textarea rows={2} placeholder="Description" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })}
        className={`w-full ${INPUT_CLS}`} />
      <textarea rows={2} placeholder="Capacités spéciales" value={values.special_abilities} onChange={(e) => setValues({ ...values, special_abilities: e.target.value })}
        className={`w-full ${INPUT_CLS}`} />
      {renderStatsInputs(statsValues, setStatsValues)}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn btn-primary text-sm">
          {saving ? '…' : submitLabel}
        </button>
        {editingId && (
          <button type="button" onClick={() => setEditingId(null)} className="btn btn-outline text-sm">Annuler</button>
        )}
      </div>
    </form>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary dark:text-primaryLight">
          Bestiaire ({monsters.length})
        </h2>
        {isMJ && (
          <button onClick={() => { setShowForm(!showForm); setEditingId(null) }} className="btn btn-primary text-sm">
            {showForm ? 'Annuler' : '+ Ajouter un monstre'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {showForm && isMJ && !editingId && renderForm(form, (v) => setForm(v), formStats, setFormStats, handleCreate, 'Créer le monstre')}

      {monsters.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun monstre dans cette campagne.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {monsters.map((monster) => (
            <div key={monster.id} className="card">
              {editingId === monster.id ? (
                renderForm(editForm, (v) => setEditForm(v), editStats, setEditStats, handleEdit, 'Sauver')
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === monster.id ? null : monster.id)}
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{monster.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {monster.monster_type && <span className="badge">{monster.monster_type}</span>}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          PV {monster.hp}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          CA {monster.armor_class}
                        </span>
                        {monster.challenge_rating && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-accent3/20 text-yellow-800 dark:text-accent3">
                            ND {monster.challenge_rating}
                          </span>
                        )}
                      </div>
                    </div>
                    {isMJ && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(monster)} className="text-xs text-primary dark:text-primaryLight hover:underline">Modifier</button>
                        <button onClick={() => handleDelete(monster.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                      </div>
                    )}
                  </div>

                  {expandedId === monster.id && (
                    <div className="mt-3 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                      {monster.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{monster.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-500">
                        {monster.attack && <span>Attaque: <code className="font-mono text-primary dark:text-primaryLight">{monster.attack}</code></span>}
                        {monster.damage && <span>Dégâts: <code className="font-mono text-primary dark:text-primaryLight">{monster.damage}</code></span>}
                      </div>
                      {monster.special_abilities && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Capacités spéciales</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{monster.special_abilities}</p>
                        </div>
                      )}
                      {/* Campaign stats */}
                      {campaignStats.length > 0 && Object.keys(monster.stats ?? {}).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {campaignStats.map((stat) => {
                            const val = monster.stats?.[String(stat.id)]
                            if (val === undefined && val !== 0) return null
                            return (
                              <span
                                key={stat.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary dark:bg-primaryLight/20 dark:text-primaryLight"
                              >
                                {stat.name.substring(0, 3).toUpperCase()} {val}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
