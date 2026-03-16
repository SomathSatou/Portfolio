import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import type { SharedFolder, FolderCategory, AccessLevel } from './types'
import { CATEGORIES, CATEGORY_ICON, CATEGORY_LABEL } from './types'
import FolderCard from './FolderCard'
import FileExplorer from './FileExplorer'
import NextcloudEmbed from './NextcloudEmbed'

type ViewMode = 'folders' | 'explorer' | 'embed'

interface CampaignOption {
  id: number
  name: string
  game_master: number
}

export default function FilesPage() {
  const { user } = useAuth()

  const [campaigns, setCampaigns] = React.useState<CampaignOption[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<number | null>(null)
  const [folders, setFolders] = React.useState<SharedFolder[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  const [viewMode, setViewMode] = React.useState<ViewMode>('folders')
  const [selectedFolder, setSelectedFolder] = React.useState<SharedFolder | null>(null)
  const [filterCategory, setFilterCategory] = React.useState<FolderCategory | ''>('')

  // Create folder modal
  const [showCreate, setShowCreate] = React.useState(false)
  const [createName, setCreateName] = React.useState('')
  const [createDesc, setCreateDesc] = React.useState('')
  const [createCategory, setCreateCategory] = React.useState<FolderCategory>('other')
  const [createAccess, setCreateAccess] = React.useState<AccessLevel>('all_players')
  const [createLoading, setCreateLoading] = React.useState(false)

  const isMJ = React.useMemo(() => {
    if (!selectedCampaignId || !user) return false
    const c = campaigns.find((c) => c.id === selectedCampaignId)
    return c?.game_master === user.id
  }, [campaigns, selectedCampaignId, user])

  // Fetch campaigns
  React.useEffect(() => {
    api.get<CampaignOption[]>('/campaigns/')
      .then((res) => {
        setCampaigns(res.data)
        if (res.data.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(res.data[0].id)
        }
      })
      .catch(() => setError('Impossible de charger les campagnes.'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch folders when campaign changes
  const fetchFolders = React.useCallback(() => {
    if (!selectedCampaignId) return
    setLoading(true)
    setError('')
    api.get<SharedFolder[]>(`/files/folders/?campaign=${selectedCampaignId}`)
      .then((res) => setFolders(res.data))
      .catch(() => setError('Impossible de charger les dossiers.'))
      .finally(() => setLoading(false))
  }, [selectedCampaignId])

  React.useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  function handleFolderClick(folder: SharedFolder) {
    setSelectedFolder(folder)
    setViewMode('explorer')
  }

  function handleBack() {
    setSelectedFolder(null)
    setViewMode('folders')
    fetchFolders()
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim() || !selectedCampaignId) return
    setCreateLoading(true)
    try {
      await api.post('/files/folders/', {
        campaign_id: selectedCampaignId,
        name: createName.trim(),
        description: createDesc.trim(),
        category: createCategory,
        access_level: createAccess,
      })
      setShowCreate(false)
      setCreateName('')
      setCreateDesc('')
      setCreateCategory('other')
      setCreateAccess('all_players')
      fetchFolders()
    } catch {
      setError('Erreur lors de la création du dossier.')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleDeleteFolder(folder: SharedFolder) {
    if (!confirm(`Supprimer le dossier "${folder.name}" ?`)) return
    try {
      await api.delete(`/files/folders/${folder.id}/`)
      fetchFolders()
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  // Filter folders by category
  const filteredFolders = filterCategory
    ? folders.filter((f) => f.category === filterCategory)
    : folders

  // If viewing a specific folder
  if (viewMode === 'explorer' && selectedFolder) {
    return <FileExplorer folder={selectedFolder} onBack={handleBack} />
  }

  if (viewMode === 'embed') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode('folders')} className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nextcloud</h2>
        </div>
        <NextcloudEmbed folderId={selectedFolder?.id} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bibliothèque</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Documents, cartes, illustrations et autres ressources de la campagne.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Nextcloud embed button */}
          <button
            onClick={() => setViewMode('embed')}
            className="btn btn-outline text-sm"
          >
            Ouvrir Nextcloud
          </button>
          {isMJ && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-primary text-sm"
            >
              + Nouveau dossier
            </button>
          )}
        </div>
      </div>

      {/* Campaign selector */}
      {campaigns.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Campagne :</label>
          <select
            value={selectedCampaignId ?? ''}
            onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('')}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            !filterCategory
              ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Tous
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filterCategory === cat
                ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Folders grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {filterCategory ? 'Aucun dossier dans cette catégorie.' : 'Aucun dossier partagé pour cette campagne.'}
          </p>
          {isMJ && !filterCategory && (
            <button onClick={() => setShowCreate(true)} className="btn btn-accent text-sm">
              Créer le premier dossier
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onClick={handleFolderClick}
              onEdit={isMJ ? () => { /* TODO: edit modal */ } : undefined}
              onDelete={isMJ ? handleDeleteFolder : undefined}
              isMJ={isMJ}
            />
          ))}
        </div>
      )}

      {/* Create folder modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Nouveau dossier partagé</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Cartes du Monde"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Description optionnelle..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value as FolderCategory)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Accès</label>
                <select
                  value={createAccess}
                  onChange={(e) => setCreateAccess(e.target.value as AccessLevel)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all_players">Tous les joueurs</option>
                  <option value="mj_only">MJ uniquement</option>
                  <option value="specific_players">Joueurs spécifiques</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn btn-outline text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !createName.trim()}
                  className="btn btn-primary text-sm"
                >
                  {createLoading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
