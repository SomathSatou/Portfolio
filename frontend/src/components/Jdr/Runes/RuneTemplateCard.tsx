import type { RuneTemplate } from './types'
import { DIFFICULTY_BADGE, DIFFICULTY_LABEL, CATEGORY_ICON, CATEGORY_LABEL } from './types'

interface RuneTemplateCardProps {
  template: RuneTemplate
  onClick: () => void
}

export default function RuneTemplateCard({ template, onClick }: RuneTemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="card text-left hover:shadow-md hover:border-primary/30 dark:hover:border-primaryLight/30 transition-all group w-full"
    >
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

      {template.mana_cost > 0 && (
        <p className="mt-1 text-xs text-primary dark:text-primaryLight">
          ✦ {template.mana_cost} mana
        </p>
      )}
    </button>
  )
}
