import React from 'react'
import api from '../api'
import type { Spell } from './types'

interface Props {
  campaignId: number
  isMJ: boolean
}

export default function CampaignSpellsPanel({ campaignId, isMJ }: Props) {
  const [spells, setSpells] = React.useState<Spell[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // Create form
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState({
    name: '', description: '', level: 1, mana_cost: 0,
    damage: '', range_distance: '', casting_time: '', duration: '', school: '',
  })
  const [saving, setSaving] = React.useState(false)

  // Edit
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [editForm, setEditForm] = React.useState(form)

  const fetchSpells = React.useCallback(async () => {
    try {
      const res = await api.get<Spell[]>(`/spells/?campaign=${campaignId}`)
      setSpells(res.data)
    } catch {
      setError('Impossible de charger les sorts.')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => { fetchSpells() }, [fetchSpells])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/spells/', { ...form, campaign: campaignId })
      setForm({ name: '', description: '', level: 1, mana_cost: 0, damage: '', range_distance: '', casting_time: '', duration: '', school: '' })
      setShowForm(false)
      await fetchSpells()
    } catch {
      setError('Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/spells/${id}/`)
      setSpells((prev) => prev.filter((s) => s.id !== id))
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  const startEdit = (spell: Spell) => {
    setEditingId(spell.id)
    setEditForm({
      name: spell.name, description: spell.description, level: spell.level,
      mana_cost: spell.mana_cost, damage: spell.damage, range_distance: spell.range_distance,
      casting_time: spell.casting_time, duration: spell.duration, school: spell.school,
    })
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setSaving(true)
    try {
      await api.patch(`/spells/${editingId}/`, editForm)
      setEditingId(null)
      await fetchSpells()
    } catch {
      setError('Erreur lors de la modification.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary dark:text-primaryLight">
          Sorts ({spells.length})
        </h2>
        {isMJ && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary text-sm">
            {showForm ? 'Annuler' : '+ Ajouter un sort'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {showForm && isMJ && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="Nom *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <input placeholder="École" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <input type="number" min={1} placeholder="Niveau" value={form.level} onChange={(e) => setForm({ ...form, level: +e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <input type="number" min={0} placeholder="Coût mana" value={form.mana_cost} onChange={(e) => setForm({ ...form, mana_cost: +e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <input placeholder="Dégâts" value={form.damage} onChange={(e) => setForm({ ...form, damage: e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <input placeholder="Portée" value={form.range_distance} onChange={(e) => setForm({ ...form, range_distance: e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <input placeholder="Temps d'incantation" value={form.casting_time} onChange={(e) => setForm({ ...form, casting_time: e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <input placeholder="Durée" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <textarea rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
          <button type="submit" disabled={saving} className="btn btn-primary text-sm">
            {saving ? 'Création…' : 'Créer le sort'}
          </button>
        </form>
      )}

      {spells.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun sort dans cette campagne.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {spells.map((spell) => (
            <div key={spell.id} className="card">
              {editingId === spell.id ? (
                <form onSubmit={handleEdit} className="space-y-2">
                  <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
                  <textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn btn-primary text-xs">{saving ? '…' : 'Sauver'}</button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn btn-outline text-xs">Annuler</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{spell.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="badge">Niv. {spell.level}</span>
                        {spell.school && <span className="badge">{spell.school}</span>}
                        {spell.mana_cost > 0 && <span className="badge">Mana: {spell.mana_cost}</span>}
                      </div>
                    </div>
                    {isMJ && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(spell)} className="text-xs text-primary dark:text-primaryLight hover:underline">Modifier</button>
                        <button onClick={() => handleDelete(spell.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                      </div>
                    )}
                  </div>
                  {spell.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{spell.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-500">
                    {spell.damage && <span>Dégâts: {spell.damage}</span>}
                    {spell.range_distance && <span>Portée: {spell.range_distance}</span>}
                    {spell.casting_time && <span>Incantation: {spell.casting_time}</span>}
                    {spell.duration && <span>Durée: {spell.duration}</span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
