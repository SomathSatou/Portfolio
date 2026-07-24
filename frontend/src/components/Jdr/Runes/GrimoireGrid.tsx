import React from 'react'
import api from '../api'
import RuneTemplateCard from './RuneTemplateCard'
import { useRunes } from './useRunes'
import type { RuneTemplate, RuneTemplateDetail } from './types'
import {
  DIFFICULTIES,
  CATEGORIES,
  DIFFICULTY_LABEL,
  CATEGORY_LABEL,
  CATEGORY_ICON,
  DIFFICULTY_BADGE,
} from './types'

interface GrimoireGridProps {
  characterId: number | null
  onReproduceRune: (template: RuneTemplateDetail) => void
}

export default function GrimoireGrid({ characterId, onReproduceRune }: GrimoireGridProps) {
  const { setActiveTab } = useRunes()
  const [templates, setTemplates] = React.useState<RuneTemplate[]>([])
  const [loading, setLoading] = React.useState(true)
  const [difficulty, setDifficulty] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [favoritesOnly, setFavoritesOnly] = React.useState(false)
  const [pendingOnly, setPendingOnly] = React.useState(false)
  const [selectedTemplate, setSelectedTemplate] = React.useState<RuneTemplateDetail | null>(null)

  const fetchTemplates = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (difficulty) params.set('difficulty', difficulty)
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      if (characterId) params.set('character', String(characterId))
      const res = await api.get<RuneTemplate[]>(`/runes/templates/?${params}`)
      setTemplates(res.data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [difficulty, category, search, characterId])

  React.useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  const fetchDetail = async (id: number) => {
    try {
      const params = characterId ? `?character=${characterId}` : ''
      const res = await api.get<RuneTemplateDetail>(`/runes/templates/${id}/${params}`)
      setSelectedTemplate(res.data)
    } catch {
      // silently fail
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent, template: RuneTemplate) => {
    e.stopPropagation()
    if (!characterId) return
    try {
      await api.post(`/runes/templates/${template.id}/favorite/`, { character_id: characterId })
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, is_favorite: !t.is_favorite } : t)),
      )
    } catch {
      // silently fail
    }
  }

  const visibleTemplates = React.useMemo(() => {
    let list = templates
    if (favoritesOnly) list = list.filter((t) => t.is_favorite)
    if (pendingOnly) list = list.filter((t) => !t.drawing_status || t.drawing_status !== 'approved')
    return list
  }, [templates, favoritesOnly, pendingOnly])

  const handleReproduce = (template: RuneTemplateDetail) => {
    onReproduceRune(template)
    setSelectedTemplate(null)
    setActiveTab('canvas')
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un glyphe…"
          className="w-full sm:w-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">Toutes difficultés</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}</option>
          ))}
        </select>
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
            favoritesOnly
              ? 'bg-primary text-white border-primary dark:bg-primaryLight dark:text-gray-900 dark:border-primaryLight'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          {favoritesOnly ? '★ Favoris' : '☆ Favoris'}
        </button>
        <button
          onClick={() => setPendingOnly((v) => !v)}
          className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
            pendingOnly
              ? 'bg-primary text-white border-primary dark:bg-primaryLight dark:text-gray-900 dark:border-primaryLight'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          Non approuvés
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement du grimoire…</p>
      ) : visibleTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">📜</p>
          <p className="text-gray-500 dark:text-gray-400">Aucun glyphe trouvé dans le grimoire.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleTemplates.map((t) => (
            <RuneTemplateCard
              key={t.id}
              template={t}
              onClick={() => fetchDetail(t.id)}
              onToggleFavorite={(e) => handleToggleFavorite(e, t)}
            />
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex justify-end p-0 sm:p-4" onClick={() => setSelectedTemplate(null)}>
          <div
            className="bg-white dark:bg-gray-900 shadow-2xl w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto p-6 border-l sm:border border-gray-200 dark:border-gray-700 sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-primary dark:text-primaryLight">
                  {selectedTemplate.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_BADGE[selectedTemplate.difficulty]}`}>
                    {DIFFICULTY_LABEL[selectedTemplate.difficulty]}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {CATEGORY_ICON[selectedTemplate.category]} {CATEGORY_LABEL[selectedTemplate.category]}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedTemplate.reference_image && (
              <div className="mb-4 rounded-lg overflow-hidden bg-amber-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <img
                  src={selectedTemplate.reference_image}
                  alt={selectedTemplate.name}
                  className="w-full h-auto object-contain max-h-64"
                />
              </div>
            )}

            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Description</h4>
                <p>{selectedTemplate.description}</p>
              </div>

              {selectedTemplate.effect_description && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Effet magique</h4>
                  <p className="text-primary dark:text-primaryLight">{selectedTemplate.effect_description}</p>
                </div>
              )}

              {selectedTemplate.mana_cost > 0 && (
                <p>✦ Coût en mana : <strong>{selectedTemplate.mana_cost}</strong></p>
              )}

              {selectedTemplate.required_materials && Object.keys(selectedTemplate.required_materials).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Matériaux nécessaires</h4>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {Object.entries(selectedTemplate.required_materials).map(([mat, qty]) => (
                      <li key={mat}>{mat} × {qty}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleReproduce(selectedTemplate)}
                className="btn btn-accent flex-1"
              >
                Reproduire ce glyphe
              </button>
              {characterId && (
                <button
                  onClick={(e) => handleToggleFavorite(e, selectedTemplate)}
                  className="btn btn-outline px-4"
                  title={selectedTemplate.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  {selectedTemplate.is_favorite ? '★' : '☆'}
                </button>
              )}
              <button
                onClick={() => setSelectedTemplate(null)}
                className="btn btn-outline"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
