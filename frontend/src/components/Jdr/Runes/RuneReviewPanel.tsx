import React from 'react'
import api from '../api'
import type { RuneDrawing } from './types'
import { STATUS_BADGE, STATUS_LABEL } from './types'

interface RuneReviewPanelProps {
  campaignId?: number
}

export default function RuneReviewPanel({ campaignId }: RuneReviewPanelProps) {
  const [pending, setPending] = React.useState<RuneDrawing[]>([])
  const [loading, setLoading] = React.useState(true)
  const [reviewingId, setReviewingId] = React.useState<number | null>(null)
  const [feedback, setFeedback] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const fetchPending = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = campaignId ? `?campaign=${campaignId}` : ''
      const res = await api.get<RuneDrawing[]>(`/runes/pending/${params}`)
      setPending(res.data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => {
    void fetchPending()
  }, [fetchPending])

  const handleReview = async (drawingId: number, status: 'approved' | 'rejected') => {
    setSubmitting(true)
    try {
      await api.post(`/runes/drawings/${drawingId}/review/`, {
        status,
        feedback,
      })
      setPending((prev) => prev.filter((d) => d.id !== drawingId))
      setReviewingId(null)
      setFeedback('')
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement des runes en attente…</p>
  }

  if (pending.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-2">✅</p>
        <p className="text-gray-500 dark:text-gray-400">Aucune rune en attente de validation.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {pending.length} rune{pending.length > 1 ? 's' : ''} en attente de validation
      </p>

      {pending.map((drawing) => (
        <div key={drawing.id} className="card">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Player drawing */}
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2">Dessin du joueur</h4>
              <div className="aspect-square max-w-sm rounded-lg overflow-hidden bg-amber-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <img
                  src={drawing.image_data}
                  alt={drawing.title}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Reference image (if from template) */}
            {drawing.template_reference_image && (
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2">Modèle de référence</h4>
                <div className="aspect-square max-w-sm rounded-lg overflow-hidden bg-amber-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <img
                    src={drawing.template_reference_image}
                    alt={drawing.template_name || 'Référence'}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{drawing.title}</h3>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[drawing.status]}`}>
                {STATUS_LABEL[drawing.status]}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span>Joueur : <strong>{drawing.player_name}</strong></span>
              <span>Personnage : <strong>{drawing.character_name}</strong></span>
              {drawing.template_name && <span>Modèle : <strong>{drawing.template_name}</strong></span>}
            </div>

            {drawing.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                Notes : {drawing.notes}
              </p>
            )}

            {drawing.submitted_at && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Soumis le {new Date(drawing.submitted_at).toLocaleDateString('fr-FR')} à{' '}
                {new Date(drawing.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Review actions */}
          {reviewingId === drawing.id ? (
            <div className="mt-4 space-y-3">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Commentaire pour le joueur (optionnel)…"
                rows={3}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleReview(drawing.id, 'approved')}
                  disabled={submitting}
                  className="btn bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                >
                  ✓ Approuver
                </button>
                <button
                  onClick={() => handleReview(drawing.id, 'rejected')}
                  disabled={submitting}
                  className="btn bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                >
                  ✗ Rejeter
                </button>
                <button
                  onClick={() => { setReviewingId(null); setFeedback('') }}
                  className="btn btn-outline"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <button
                onClick={() => setReviewingId(drawing.id)}
                className="btn btn-primary"
              >
                Valider cette rune
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
