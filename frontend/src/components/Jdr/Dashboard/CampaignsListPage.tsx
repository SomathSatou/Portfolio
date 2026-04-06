import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import CampaignCard from './CampaignCard'
import type { Campaign } from './types'

export default function CampaignsListPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)

  // Create campaign (MJ only)
  const isMJ = user?.role === 'mj'
  const [showCreate, setShowCreate] = React.useState(false)
  const [createName, setCreateName] = React.useState('')
  const [createDesc, setCreateDesc] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  const fetchCampaigns = React.useCallback(async () => {
    try {
      const res = await api.get<Campaign[]>('/campaigns/')
      setCampaigns(res.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const [createError, setCreateError] = React.useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) return
    setCreating(true)
    try {
      const res = await api.post<Campaign>('/campaigns/', { name: createName.trim(), description: createDesc.trim() })
      setCreateName('')
      setCreateDesc('')
      setShowCreate(false)
      window.location.hash = `#/jdr/campaign/${res.data.id}`
    } catch {
      setCreateError('Erreur lors de la création.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Campagnes</h1>
        {isMJ && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary text-sm">
            {showCreate ? 'Annuler' : '+ Créer une campagne'}
          </button>
        )}
      </div>

      {/* Create campaign form (MJ) */}
      {showCreate && isMJ && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <input
            required
            placeholder="Nom de la campagne *"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            rows={2}
            placeholder="Description (optionnel)"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="submit" disabled={creating} className="btn btn-primary text-sm">
            {creating ? 'Création…' : 'Créer'}
          </button>
        </form>
      )}

      {createError && <p className="text-sm text-red-500">{createError}</p>}

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune campagne. Rejoignez-en une via la fiche de votre personnage avec un code d'invitation.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  )
}
