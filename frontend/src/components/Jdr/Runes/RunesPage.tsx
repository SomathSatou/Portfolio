import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import RuneCanvas from './RuneCanvas'
import GrimoireGrid from './GrimoireGrid'
import RuneDrawingCard from './RuneDrawingCard'
import RuneCollectionCard from './RuneCollectionCard'
import RuneReviewPanel from './RuneReviewPanel'
import type { RuneDrawing, RuneCollectionItem, RuneTemplateDetail } from './types'

type Tab = 'grimoire' | 'canvas' | 'drawings' | 'collection' | 'review'

interface CharacterOption {
  id: number
  name: string
  campaign: number
  campaign_name: string
}

export default function RunesPage() {
  const { user } = useAuth()
  const isMJ = user?.role === 'mj'

  const [activeTab, setActiveTab] = React.useState<Tab>('grimoire')
  const [characters, setCharacters] = React.useState<CharacterOption[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = React.useState<number | null>(null)

  // Canvas state
  const [canvasTitle, setCanvasTitle] = React.useState('')
  const [canvasNotes, setCanvasNotes] = React.useState('')
  const [canvasImageData, setCanvasImageData] = React.useState<string | null>(null)
  const [referenceImage, setReferenceImage] = React.useState<string | null>(null)
  const [referenceTemplateId, setReferenceTemplateId] = React.useState<number | null>(null)
  const [editingDrawingId, setEditingDrawingId] = React.useState<number | null>(null)
  const [editingInitialData, setEditingInitialData] = React.useState<string | null>(null)

  // Drawings & collection
  const [drawings, setDrawings] = React.useState<RuneDrawing[]>([])
  const [collection, setCollection] = React.useState<RuneCollectionItem[]>([])
  const [loadingDrawings, setLoadingDrawings] = React.useState(false)
  const [loadingCollection, setLoadingCollection] = React.useState(false)

  // Preview modal
  const [previewDrawing, setPreviewDrawing] = React.useState<RuneDrawing | null>(null)

  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState<{ text: string; ok: boolean } | null>(null)

  // Fetch characters
  React.useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<CharacterOption[]>('/characters/')
        setCharacters(res.data)
        if (res.data.length > 0 && !selectedCharacterId) {
          setSelectedCharacterId(res.data[0].id)
        }
      } catch {
        // silently fail
      }
    }
    void fetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId)

  // Fetch drawings
  const fetchDrawings = React.useCallback(async () => {
    if (!selectedCharacterId) return
    setLoadingDrawings(true)
    try {
      const res = await api.get<RuneDrawing[]>(`/runes/drawings/?character=${selectedCharacterId}`)
      setDrawings(res.data)
    } catch {
      // silently fail
    } finally {
      setLoadingDrawings(false)
    }
  }, [selectedCharacterId])

  // Fetch collection
  const fetchCollection = React.useCallback(async () => {
    if (!selectedCharacterId) return
    setLoadingCollection(true)
    try {
      const res = await api.get<RuneCollectionItem[]>(`/runes/collection/?character=${selectedCharacterId}`)
      setCollection(res.data)
    } catch {
      // silently fail
    } finally {
      setLoadingCollection(false)
    }
  }, [selectedCharacterId])

  React.useEffect(() => {
    if (activeTab === 'drawings') void fetchDrawings()
    if (activeTab === 'collection') void fetchCollection()
  }, [activeTab, fetchDrawings, fetchCollection])

  // Handle reproduce from grimoire
  const handleReproduceRune = (template: RuneTemplateDetail) => {
    setReferenceImage(template.reference_image)
    setReferenceTemplateId(template.id)
    setCanvasTitle(template.name)
    setCanvasNotes('')
    setEditingDrawingId(null)
    setEditingInitialData(null)
    setCanvasImageData(null)
    setActiveTab('canvas')
  }

  // Handle canvas save (capture)
  const handleCanvasSave = (imageData: string) => {
    setCanvasImageData(imageData)
    setMessage({ text: 'Dessin capturé ! Sauvegardez ou soumettez ci-dessous.', ok: true })
  }

  // Save draft
  const handleSaveDraft = async () => {
    if (!canvasImageData || !selectedCharacterId || !selectedCharacter || !canvasTitle.trim()) {
      setMessage({ text: 'Veuillez capturer un dessin et entrer un titre.', ok: false })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      if (editingDrawingId) {
        await api.put(`/runes/drawings/${editingDrawingId}/`, {
          title: canvasTitle,
          notes: canvasNotes,
          image_data: canvasImageData,
        })
        setMessage({ text: 'Brouillon mis à jour !', ok: true })
      } else {
        const payload: Record<string, unknown> = {
          title: canvasTitle,
          notes: canvasNotes,
          image_data: canvasImageData,
          character_id: selectedCharacterId,
          campaign_id: selectedCharacter.campaign,
        }
        if (referenceTemplateId) payload.template_id = referenceTemplateId
        await api.post('/runes/drawings/', payload)
        setMessage({ text: 'Brouillon sauvegardé !', ok: true })
      }
      // Reset
      setCanvasImageData(null)
      setEditingDrawingId(null)
      setEditingInitialData(null)
    } catch {
      setMessage({ text: 'Erreur lors de la sauvegarde.', ok: false })
    } finally {
      setSaving(false)
    }
  }

  // Submit to MJ
  const handleSubmitToMJ = async () => {
    if (!canvasImageData || !selectedCharacterId || !selectedCharacter || !canvasTitle.trim()) {
      setMessage({ text: 'Veuillez capturer un dessin et entrer un titre.', ok: false })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      let drawingId = editingDrawingId
      if (!drawingId) {
        // Create first
        const payload: Record<string, unknown> = {
          title: canvasTitle,
          notes: canvasNotes,
          image_data: canvasImageData,
          character_id: selectedCharacterId,
          campaign_id: selectedCharacter.campaign,
        }
        if (referenceTemplateId) payload.template_id = referenceTemplateId
        const res = await api.post<RuneDrawing>('/runes/drawings/', payload)
        drawingId = res.data.id
      } else {
        // Update first
        await api.put(`/runes/drawings/${drawingId}/`, {
          title: canvasTitle,
          notes: canvasNotes,
          image_data: canvasImageData,
        })
      }
      // Submit
      await api.post(`/runes/drawings/${drawingId}/submit/`)
      setMessage({ text: 'Rune soumise au MJ pour validation !', ok: true })
      // Reset
      setCanvasImageData(null)
      setEditingDrawingId(null)
      setEditingInitialData(null)
      setCanvasTitle('')
      setCanvasNotes('')
      setReferenceImage(null)
      setReferenceTemplateId(null)
    } catch {
      setMessage({ text: 'Erreur lors de la soumission.', ok: false })
    } finally {
      setSaving(false)
    }
  }

  // Edit a draft
  const handleEditDrawing = (drawing: RuneDrawing) => {
    setEditingDrawingId(drawing.id)
    setEditingInitialData(drawing.image_data)
    setCanvasTitle(drawing.title)
    setCanvasNotes(drawing.notes)
    setReferenceImage(drawing.template_reference_image)
    setReferenceTemplateId(drawing.template)
    setCanvasImageData(null)
    setActiveTab('canvas')
  }

  // Resubmit a rejected drawing
  const handleResubmitDrawing = (drawing: RuneDrawing) => {
    handleEditDrawing(drawing)
  }

  // Delete a drawing
  const handleDeleteDrawing = async (drawingId: number) => {
    try {
      await api.delete(`/runes/drawings/${drawingId}/`)
      setDrawings((prev) => prev.filter((d) => d.id !== drawingId))
      setPreviewDrawing(null)
    } catch {
      // silently fail
    }
  }

  const tabs: { key: Tab; label: string; mjOnly?: boolean }[] = [
    { key: 'grimoire', label: '📜 Grimoire' },
    { key: 'canvas', label: '🖌️ Canvas' },
    { key: 'drawings', label: '📋 Mes runes' },
    { key: 'collection', label: '✨ Collection' },
    ...(isMJ ? [{ key: 'review' as Tab, label: '⚖️ Validation', mjOnly: true }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Atelier de Runes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Consultez le grimoire, tracez vos runes et soumettez-les au Maître du Jeu.
        </p>
      </div>

      {/* Character selector */}
      {characters.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Personnage :</label>
          <select
            value={selectedCharacterId ?? ''}
            onChange={(e) => setSelectedCharacterId(Number(e.target.value))}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.campaign_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary dark:border-primaryLight dark:text-primaryLight'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'grimoire' && (
        <GrimoireGrid onReproduceRune={handleReproduceRune} />
      )}

      {activeTab === 'canvas' && (
        <div className="space-y-4">
          <RuneCanvas
            key={editingDrawingId ?? 'new'}
            width={800}
            height={800}
            referenceImage={referenceImage}
            initialData={editingInitialData}
            onSave={handleCanvasSave}
          />

          {/* Title & notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
              <input
                value={canvasTitle}
                onChange={(e) => setCanvasTitle(e.target.value)}
                placeholder="Nom de la rune…"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optionnel)</label>
              <input
                value={canvasNotes}
                onChange={(e) => setCanvasNotes(e.target.value)}
                placeholder="Notes ou commentaires…"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Message */}
          {message && (
            <p className={`text-sm ${message.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {message.text}
            </p>
          )}

          {/* Canvas preview */}
          {canvasImageData && (
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aperçu du dessin capturé :</p>
              <img src={canvasImageData} alt="Aperçu" className="max-w-xs rounded-md border border-gray-200 dark:border-gray-700" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleSaveDraft}
              disabled={saving || !canvasImageData}
              className="btn btn-outline"
            >
              {saving ? 'Sauvegarde…' : editingDrawingId ? 'Mettre à jour le brouillon' : 'Sauvegarder brouillon'}
            </button>
            <button
              onClick={handleSubmitToMJ}
              disabled={saving || !canvasImageData}
              className="btn btn-accent"
            >
              {saving ? 'Envoi…' : 'Soumettre au MJ'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'drawings' && (
        <div>
          {loadingDrawings ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement…</p>
          ) : drawings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">🖌️</p>
              <p className="text-gray-500 dark:text-gray-400">Aucune rune dessinée pour l&#39;instant.</p>
              <button onClick={() => setActiveTab('canvas')} className="btn btn-primary mt-4">
                Dessiner une rune
              </button>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {drawings.map((d) => (
                <RuneDrawingCard
                  key={d.id}
                  drawing={d}
                  onClick={() => setPreviewDrawing(d)}
                  onEdit={() => handleEditDrawing(d)}
                  onResubmit={() => handleResubmitDrawing(d)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'collection' && (
        <div>
          {loadingCollection ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement…</p>
          ) : collection.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">✨</p>
              <p className="text-gray-500 dark:text-gray-400">Votre grimoire personnel est vide.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Dessinez et faites valider des runes pour les ajouter à votre collection.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {collection.map((item) => (
                <RuneCollectionCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'review' && isMJ && (
        <RuneReviewPanel campaignId={selectedCharacter?.campaign} />
      )}

      {/* Preview modal */}
      {previewDrawing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPreviewDrawing(null)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-primary dark:text-primaryLight">{previewDrawing.title}</h3>
              <button
                onClick={() => setPreviewDrawing(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-lg overflow-hidden bg-amber-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4">
              <img src={previewDrawing.image_data} alt={previewDrawing.title} className="w-full h-auto object-contain" />
            </div>

            {previewDrawing.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                {previewDrawing.notes}
              </p>
            )}

            {previewDrawing.mj_feedback && (
              <div className={`p-3 rounded-md mb-3 ${
                previewDrawing.status === 'rejected'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              }`}>
                <p className={`text-sm ${
                  previewDrawing.status === 'rejected'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-green-700 dark:text-green-300'
                }`}>
                  <strong>MJ :</strong> {previewDrawing.mj_feedback}
                </p>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              {previewDrawing.status === 'draft' && (
                <>
                  <button
                    onClick={() => { handleEditDrawing(previewDrawing); setPreviewDrawing(null) }}
                    className="btn btn-outline text-sm"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteDrawing(previewDrawing.id)}
                    className="btn text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Supprimer
                  </button>
                </>
              )}
              {previewDrawing.status === 'rejected' && (
                <button
                  onClick={() => { handleResubmitDrawing(previewDrawing); setPreviewDrawing(null) }}
                  className="btn btn-accent text-sm"
                >
                  Modifier et resoumettre
                </button>
              )}
              <button onClick={() => setPreviewDrawing(null)} className="btn btn-outline text-sm">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
