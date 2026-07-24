import type { RuneTemplate } from './types'
import { DIFFICULTY_BADGE, DIFFICULTY_LABEL, CATEGORY_ICON, CATEGORY_LABEL, STATUS_LABEL } from './types'

interface RuneTemplateCardProps {
  template: RuneTemplate
  onClick: () => void
  onToggleFavorite?: (e: React.MouseEvent) => void
}

export default function RuneTemplateCard({ template, onClick, onToggleFavorite }: RuneTemplateCardProps) {
  const progressLabel = template.drawing_status ? STATUS_LABEL[template.drawing_status] : null

  return (
    <button
      onClick={onClick}
      className="card text-left hover:shadow-md hover:border-primary/30 dark:hover:border-primaryLight/30 transition-all group w-full relative"
    >
      {/* Favorite marker */}
      {onToggleFavorite && (
        <span
          onClick={onToggleFavorite}
          className={`absolute top-2 right-2 z-10 text-lg transition-transform hover:scale-110 ${
            template.is_favorite ? 'text-accent3' : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100'
          }`}
          title={template.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {template.is_favorite ? '★' : '☆'}
        </span>
      )}

      {/* Reference image */}
      <div className="aspect-square rounded-md overflow-hidden bg-amber-50 dark:bg-gray-800 mb-3 flex items-center justify-center border border-gray-200 dark:border-gray-700">
        {template.reference_image ? (
          <img
            src={template.reference_image}
            alt={template.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-5xl opacity-40">
            {CATEGORY_ICON[template.category] || '🔮'}
          </span>
        )}
      </div>

      {/* Info */}
      <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
        {template.name}
      </h4>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_BADGE[template.difficulty]}`}>
          {DIFFICULTY_LABEL[template.difficulty]}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {CATEGORY_ICON[template.category]} {CATEGORY_LABEL[template.category]}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        {template.mana_cost > 0 && (
          <p className="text-xs text-primary dark:text-primaryLight">
            ✦ {template.mana_cost} mana
          </p>
        )}
        {progressLabel && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {progressLabel}
          </span>
        )}
      </div>
    </button>
  )
}
