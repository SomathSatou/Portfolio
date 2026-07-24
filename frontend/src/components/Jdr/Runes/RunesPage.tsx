import React from 'react'
import api from '../api'
import GrimoireGrid from './GrimoireGrid'
import RuneCanvas from './RuneCanvas'
import RuneCollectionCard from './RuneCollectionCard'
import RuneDrawingCard from './RuneDrawingCard'
import { RunesProvider } from './RunesProvider'
import type { RunesTab } from './RunesContext'
import { useRunes } from './useRunes'
import RuneReviewPanel from './RuneReviewPanel'
import RunesSidebar from './RunesSidebar'
import type { CharacterOption, RuneCollectionItem, RuneDrawing, RuneTemplateDetail } from './types'

function RunesPageInner() {
  const { activeTab, setActiveTab, selectedCharacterId, setSelectedCharacterId, isMJ } = useRunes()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [characters, setCharacters] = React.useState<CharacterOption[]>([])

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

  const groupedDrawings = React.useMemo(() => {
    const order: RuneDrawing['status'][] = ['draft', 'submitted', 'rejected', 'approved']
    const groups: Record<RuneDrawing['status'], RuneDrawing[]> = {
      draft: [],
      submitted: [],
      approved: [],
      rejected: [],
    }
    for (const d of drawings) {
      groups[d.status].push(d)
    }
    return order.map((status) => ({ status, items: groups[status] }))
  }, [drawings])

  const sectionTitle: Record<RunesTab, string> = {
    grimoire: 'Grimoire',
    canvas: 'Atelier',
    drawings: 'Mes runes',
    collection: 'Collection',
    review: 'Validation MJ',
  }
  const sectionTitleText = sectionTitle[activeTab]

  return (
    <div className="flex min-h-[calc(100vh-4rem)] -m-4 lg:-m-6 p-4 lg:p-0">
      <RunesSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 lg:p-6 space-y-5">
        {/* Top header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                aria-label="Ouvrir le menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">{sectionTitleText}</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === 'grimoire' && 'Consultez le grimoire, filtrez et reproduisez les glyphes.'}
              {activeTab === 'canvas' && 'Tracez votre glyphe à l\'aide du pinceau, puis soumettez-le au MJ.'}
              {activeTab === 'drawings' && 'Retrouvez tous vos glyphes dessinés et leur statut.'}
              {activeTab === 'collection' && 'Vos glyphes validés sont conservés dans votre grimoire personnel.'}
              {activeTab === 'review' && 'Validez les glyphes soumis par les joueurs.'}
            </p>
          </div>
          {activeTab !== 'review' && characters.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Personnage :</label>
              <select
                value={selectedCharacterId ?? ''}
                onChange={(e) => setSelectedCharacterId(Number(e.target.value))}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
              >
                {characters.map((c: CharacterOption) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.campaign_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === 'grimoire' && (
          <GrimoireGrid
            characterId={selectedCharacterId}
            onReproduceRune={handleReproduceRune}
          />
        )}

        {activeTab === 'canvas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
              {/* Reference panel */}
              <div className={`card p-3 space-y-2 ${referenceImage ? '' : 'hidden lg:flex lg:items-center lg:justify-center'}`}>
                <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400 lg:hidden">
                  Référence
                </h4>
                {referenceImage ? (
                  <div className="aspect-square rounded-lg overflow-hidden bg-amber-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <img
                      src={referenceImage}
                      alt="Référence"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                    Sélectionnez un glyphe dans le Grimoire pour charger sa référence.
                  </p>
                )}
              </div>

              <RuneCanvas
                key={editingDrawingId ?? 'new'}
                width={800}
                height={800}
                referenceImage={referenceImage}
                initialData={editingInitialData}
                onSave={handleCanvasSave}
              />
            </div>

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

            {message && (
              <p className={`text-sm ${message.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {message.text}
              </p>
            )}

            {canvasImageData && (
              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aperçu du dessin capturé :</p>
                <img src={canvasImageData} alt="Aperçu" className="max-w-xs rounded-md border border-gray-200 dark:border-gray-700" />
              </div>
            )}

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
          <div className="space-y-6">
            {loadingDrawings ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement…</p>
            ) : drawings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">🖌️</p>
                <p className="text-gray-500 dark:text-gray-400">Aucune rune dessinée pour l&apos;instant.</p>
              </div>
            ) : (
              groupedDrawings.map(({ status, items }) =>
                items.length > 0 ? (
                  <div key={status}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                      {status === 'draft' && 'Brouillons'}
                      {status === 'submitted' && 'En attente de validation'}
                      {status === 'rejected' && 'Rejetés'}
                      {status === 'approved' && 'Approuvés'}
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300">
                        {items.length}
                      </span>
                    </h3>
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {items.map((d) => (
                        <RuneDrawingCard
                          key={d.id}
                          drawing={d}
                          onClick={() => setPreviewDrawing(d)}
                          onEdit={() => handleEditDrawing(d)}
                          onResubmit={() => handleResubmitDrawing(d)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null,
              )
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
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">{previewDrawing.notes}</p>
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
      </main>
    </div>
  )
}

export default function RunesPage() {
  return (
    <RunesProvider>
      <RunesPageInner />
    </RunesProvider>
  )
}
