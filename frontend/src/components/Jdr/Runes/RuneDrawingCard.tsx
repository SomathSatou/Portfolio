import type { RuneDrawing } from './types'
import { STATUS_BADGE, STATUS_LABEL } from './types'

interface RuneDrawingCardProps {
  drawing: RuneDrawing
  onEdit?: () => void
  onResubmit?: () => void
  onClick?: () => void
}

export default function RuneDrawingCard({ drawing, onEdit, onResubmit, onClick }: RuneDrawingCardProps) {
  return (
    <div
      className="card hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-square rounded-md overflow-hidden bg-amber-50 dark:bg-gray-800 mb-3 border border-gray-200 dark:border-gray-700">
        <img
          src={drawing.image_data}
          alt={drawing.title}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
        />
      </div>

      {/* Title & status */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
          {drawing.title}
        </h4>
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_BADGE[drawing.status]}`}>
          {STATUS_LABEL[drawing.status]}
        </span>
      </div>

      {/* Template name if any */}
      {drawing.template_name && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
          Modèle : {drawing.template_name}
        </p>
      )}

      {/* MJ feedback for rejected */}
      {drawing.status === 'rejected' && drawing.mj_feedback && (
        <div className="mt-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-300">
            <strong>MJ :</strong> {drawing.mj_feedback}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        {drawing.status === 'draft' && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="btn btn-outline text-xs py-1 px-2"
          >
            Modifier
          </button>
        )}
        {drawing.status === 'rejected' && onResubmit && (
          <button
            onClick={(e) => { e.stopPropagation(); onResubmit() }}
            className="btn btn-accent text-xs py-1 px-2"
          >
            Resoumettre
          </button>
        )}
      </div>

      {/* Date */}
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        {new Date(drawing.created_at).toLocaleDateString('fr-FR')}
      </p>
    </div>
  )
}
