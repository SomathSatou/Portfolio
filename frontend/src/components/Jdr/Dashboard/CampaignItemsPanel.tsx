import React from 'react'
import api from '../api'
import type { Item } from './types'

interface Props {
  campaignId: number
  isMJ: boolean
}

const RARITY_LABELS: Record<string, string> = {
  commun: 'Commun',
  peu_commun: 'Peu commun',
  rare: 'Rare',
  'très_rare': 'Très rare',
  'légendaire': 'Légendaire',
  'artéfact': 'Artéfact',
}

const RARITY_COLORS: Record<string, string> = {
  commun: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  peu_commun: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'très_rare': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  'légendaire': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  'artéfact': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function CampaignItemsPanel({ campaignId, isMJ }: Props) {
  const [items, setItems] = React.useState<Item[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState({
    name: '', description: '', rarity: 'commun', item_type: '',
    weight: 0, value: 0, is_magical: false,
  })
  const [saving, setSaving] = React.useState(false)

  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [editForm, setEditForm] = React.useState(form)

  const fetchItems = React.useCallback(async () => {
    try {
      const res = await api.get<Item[]>(`/items/?campaign=${campaignId}`)
      setItems(res.data)
    } catch {
      setError('Impossible de charger les objets.')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => { fetchItems() }, [fetchItems])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/items/', { ...form, campaign: campaignId })
      setForm({ name: '', description: '', rarity: 'commun', item_type: '', weight: 0, value: 0, is_magical: false })
      setShowForm(false)
      await fetchItems()
    } catch {
      setError('Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/items/${id}/`)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  const startEdit = (item: Item) => {
    setEditingId(item.id)
    setEditForm({
      name: item.name, description: item.description, rarity: item.rarity,
      item_type: item.item_type, weight: item.weight, value: item.value, is_magical: item.is_magical,
    })
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setSaving(true)
    try {
      await api.patch(`/items/${editingId}/`, editForm)
      setEditingId(null)
      await fetchItems()
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
          Objets ({items.length})
        </h2>
        {isMJ && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary text-sm">
            {showForm ? 'Annuler' : '+ Ajouter un objet'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {showForm && isMJ && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="Nom *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <input placeholder="Type (arme, armure, potion…)" value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary">
              {Object.entries(RARITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.is_magical} onChange={(e) => setForm({ ...form, is_magical: e.target.checked })} />
              Magique
            </label>
            <input type="number" min={0} step={0.01} placeholder="Poids (kg)" value={form.weight} onChange={(e) => setForm({ ...form, weight: +e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
            <input type="number" min={0} step={0.01} placeholder="Valeur (PO)" value={form.value} onChange={(e) => setForm({ ...form, value: +e.target.value })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <textarea rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
          <button type="submit" disabled={saving} className="btn btn-primary text-sm">
            {saving ? 'Création…' : 'Créer l\'objet'}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun objet dans cette campagne.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="card">
              {editingId === item.id ? (
                <form onSubmit={handleEdit} className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input required placeholder="Nom" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
                    <input placeholder="Type" value={editForm.item_type} onChange={(e) => setEditForm({ ...editForm, item_type: e.target.value })}
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
                    <select value={editForm.rarity} onChange={(e) => setEditForm({ ...editForm, rarity: e.target.value })}
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary">
                      {Object.entries(RARITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={editForm.is_magical} onChange={(e) => setEditForm({ ...editForm, is_magical: e.target.checked })} />
                      Magique
                    </label>
                    <input type="number" min={0} step={0.01} placeholder="Poids (kg)" value={editForm.weight} onChange={(e) => setEditForm({ ...editForm, weight: +e.target.value })}
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
                    <input type="number" min={0} step={0.01} placeholder="Valeur (PO)" value={editForm.value} onChange={(e) => setEditForm({ ...editForm, value: +e.target.value })}
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <textarea rows={2} placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
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
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {item.name}
                        {item.is_magical && <span className="ml-1 text-accent3">✦</span>}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${RARITY_COLORS[item.rarity] ?? ''}`}>
                          {RARITY_LABELS[item.rarity] ?? item.rarity}
                        </span>
                        {item.item_type && <span className="badge">{item.item_type}</span>}
                        {item.resource_name && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            Comptoir: {item.resource_name}
                          </span>
                        )}
                      </div>
                    </div>
                    {isMJ && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(item)} className="text-xs text-primary dark:text-primaryLight hover:underline">Modifier</button>
                        <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                      </div>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-500">
                    {item.weight > 0 && <span>Poids: {item.weight} kg</span>}
                    {item.value > 0 && <span>Valeur: {item.value} PO</span>}
                  </div>
                  {item.properties && Object.keys(item.properties).length > 0 && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      {Object.entries(item.properties).map(([k, v]) => (
                        <div key={k}><span className="font-medium">{k}:</span> {String(v)}</div>
                      ))}
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
