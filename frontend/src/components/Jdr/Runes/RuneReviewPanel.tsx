import React from 'react'
import api from '../api'
import RuneAnnotationsOverlay from './RuneAnnotationsOverlay'
import { useAnnotationsEditor } from './useAnnotationsEditor'
import type { RuneDrawing } from './types'
import { STATUS_BADGE, STATUS_LABEL } from './types'

interface RuneReviewPanelProps {
  campaignId?: number
}

export default function RuneReviewPanel({ campaignId }: RuneReviewPanelProps) {
  const [pending, setPending] = React.useState<RuneDrawing[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [feedback, setFeedback] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [history, setHistory] = React.useState<Record<number, string>>({})
  const { annotations, setAnnotations, addCircle, addText, addArrow, clear } = useAnnotationsEditor()

  const fetchPending = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = campaignId ? `?campaign=${campaignId}` : ''
      const res = await api.get<RuneDrawing[]>(`/runes/pending/${params}`)
      setPending(res.data)
      setSelectedIndex(0)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => {
    void fetchPending()
  }, [fetchPending])

  const selectedDrawing = pending[selectedIndex] ?? null

  React.useEffect(() => {
    if (selectedDrawing) {
      setFeedback(history[selectedDrawing.id] ?? '')
      setAnnotations(selectedDrawing.mj_annotations ?? {})
    } else {
      setFeedback('')
      setAnnotations({})
    }
  }, [selectedDrawing, history, setAnnotations])

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedDrawing) return
    setSubmitting(true)
    try {
      await api.patch(`/runes/drawings/${selectedDrawing.id}/annotations/`, { mj_annotations: annotations })
      await api.post(`/runes/drawings/${selectedDrawing.id}/review/`, { status, feedback })
      setPending((prev) => prev.filter((d) => d.id !== selectedDrawing.id))
      setHistory((prev) => {
        const next = { ...prev }
        delete next[selectedDrawing.id]
        return next
      })
      if (selectedIndex >= pending.length - 1) {
        setSelectedIndex((i) => Math.max(0, i - 1))
      }
      clear()
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    setSelectedIndex((i) => Math.min(pending.length - 1, i + 1))
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement des glyphes en attente…</p>
  }

  if (pending.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-2">✅</p>
        <p className="text-gray-500 dark:text-gray-400">Aucun glyphe en attente de validation.</p>
      </div>
    )
  }

  if (!selectedDrawing) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-2">✅</p>
        <p className="text-gray-500 dark:text-gray-400">Aucun glyphe sélectionné.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
      {/* List */}
      <aside className="w-full lg:w-72 shrink-0 overflow-y-auto pr-2 space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400 px-1">
          {pending.length} en attente
        </p>
        {pending.map((drawing, idx) => (
          <button
            key={drawing.id}
            onClick={() => setSelectedIndex(idx)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              idx === selectedIndex
                ? 'bg-primary/10 border-primary dark:bg-primaryLight/20 dark:border-primaryLight'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <img
                src={drawing.image_data}
                alt={drawing.title}
                className="w-10 h-10 rounded object-cover bg-amber-50 dark:bg-gray-800"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{drawing.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {drawing.player_name} — {drawing.character_name}
                </p>
              </div>
            </div>
          </button>
        ))}
      </aside>

      {/* Detail */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-4">
        {/* Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-3 space-y-2">
            <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400">Dessin du joueur</h4>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-amber-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <img
                src={selectedDrawing.image_data}
                alt={selectedDrawing.title}
                className="w-full h-full object-contain"
              />
              <RuneAnnotationsOverlay
                annotations={annotations}
                width={800}
                height={800}
              />
            </div>
          </div>

          {selectedDrawing.template_reference_image ? (
            <div className="card p-3 space-y-2">
              <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400">Modèle de référence</h4>
              <div className="aspect-square rounded-lg overflow-hidden bg-amber-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <img
                  src={selectedDrawing.template_reference_image}
                  alt={selectedDrawing.template_name || 'Référence'}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="card p-3 flex items-center justify-center text-gray-400 dark:text-gray-500">
              Pas de modèle de référence
            </div>
          )}
        </div>

        {/* Info */}
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedDrawing.title}</h3>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span>Joueur : <strong>{selectedDrawing.player_name}</strong></span>
                <span>Personnage : <strong>{selectedDrawing.character_name}</strong></span>
                {selectedDrawing.template_name && <span>Modèle : <strong>{selectedDrawing.template_name}</strong></span>}
              </div>
            </div>
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[selectedDrawing.status]}`}>
              {STATUS_LABEL[selectedDrawing.status]}
            </span>
          </div>

          {selectedDrawing.notes && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 italic">
              Notes : {selectedDrawing.notes}
            </p>
          )}

          {selectedDrawing.submitted_at && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Soumis le {new Date(selectedDrawing.submitted_at).toLocaleDateString('fr-FR')} à{' '}
              {new Date(selectedDrawing.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Annotations toolbar */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Annotations visuelles</h4>
            <div className="flex gap-2">
              <button
                onClick={() => addCircle(400, 400, 60, 'Zone à corriger')}
                className="btn btn-outline text-xs py-1 px-2"
              >
                Ajouter cercle
              </button>
              <button
                onClick={() => addText(400, 400, 'À corriger')}
                className="btn btn-outline text-xs py-1 px-2"
              >
                Ajouter texte
              </button>
              <button
                onClick={() => addArrow(300, 300, 400, 400)}
                className="btn btn-outline text-xs py-1 px-2"
              >
                Ajouter flèche
              </button>
              <button onClick={clear} className="btn text-xs py-1 px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                Effacer
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Les annotations sont sauvegardées automatiquement avec la validation.
          </p>
        </div>

        {/* Feedback & actions */}
        <div className="card space-y-3">
          <textarea
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value)
              setHistory((prev) => ({ ...prev, [selectedDrawing.id]: e.target.value }))
            }}
            placeholder="Commentaire pour le joueur (optionnel)…"
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleReview('approved')}
              disabled={submitting}
              className="btn bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              ✓ Approuver
            </button>
            <button
              onClick={() => handleReview('rejected')}
              disabled={submitting}
              className="btn bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            >
              ✗ Rejeter
            </button>
            <button
              onClick={handleSkip}
              disabled={submitting || pending.length <= 1}
              className="btn btn-outline"
            >
              Passer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
