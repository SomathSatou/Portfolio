import React from 'react'
import api from '../api'
import type { Stat } from './types'

interface Props {
  campaignId: number
  isMJ: boolean
}

export default function CampaignStatsPanel({ campaignId, isMJ }: Props) {
  const [stats, setStats] = React.useState<Stat[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  const [newName, setNewName] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [editName, setEditName] = React.useState('')

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await api.get<Stat[]>(`/stats/?campaign=${campaignId}`)
      setStats(res.data)
    } catch {
      setError('Impossible de charger les statistiques.')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => { fetchStats() }, [fetchStats])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      await api.post('/stats/', { campaign: campaignId, name: newName.trim(), display_order: stats.length })
      setNewName('')
      await fetchStats()
    } catch {
      setError('Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/stats/${id}/`)
      setStats((prev) => prev.filter((s) => s.id !== id))
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  const startEdit = (stat: Stat) => {
    setEditingId(stat.id)
    setEditName(stat.name)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !editName.trim()) return
    setSaving(true)
    try {
      await api.patch(`/stats/${editingId}/`, { name: editName.trim() })
      setEditingId(null)
      await fetchStats()
    } catch {
      setError('Erreur lors de la modification.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-primary dark:text-primaryLight">
        Statistiques de campagne ({stats.length})
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Définissez les stats que chaque personnage possédera (valeur entre 0 et 20).
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {isMJ && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            required
            placeholder="Nom de la stat (ex: Adresse, Intelligence…)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="submit" disabled={saving} className="btn btn-primary text-sm">
            {saving ? '…' : '+ Ajouter'}
          </button>
        </form>
      )}

      {stats.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune statistique définie.</p>
      ) : (
        <div className="space-y-2">
          {stats.map((stat) => (
            <div key={stat.id} className="card flex items-center justify-between gap-3 !py-2">
              {editingId === stat.id ? (
                <form onSubmit={handleEdit} className="flex items-center gap-2 flex-1">
                  <input
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button type="submit" disabled={saving} className="btn btn-primary text-xs">{saving ? '…' : 'OK'}</button>
                  <button type="button" onClick={() => setEditingId(null)} className="btn btn-outline text-xs">Annuler</button>
                </form>
              ) : (
                <>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{stat.name}</span>
                  {isMJ && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEdit(stat)} className="text-xs text-primary dark:text-primaryLight hover:underline">Renommer</button>
                      <button onClick={() => handleDelete(stat.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
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
