import type { RuneCollectionItem } from './types'
import { CATEGORY_ICON, CATEGORY_LABEL } from './types'

interface RuneCollectionCardProps {
  item: RuneCollectionItem
}

export default function RuneCollectionCard({ item }: RuneCollectionCardProps) {
  return (
    <div className="card bg-gradient-to-br from-amber-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-primary/10 border-primary/20 dark:border-primaryLight/20 hover:shadow-lg transition-all">
      {/* Image */}
      <div className="aspect-square rounded-md overflow-hidden bg-amber-50 dark:bg-gray-800 mb-3 border border-primary/20 dark:border-primaryLight/20 ring-1 ring-primary/10 dark:ring-primaryLight/10">
        <img
          src={item.drawing_image}
          alt={item.drawing_title}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Title */}
      <h4 className="font-semibold text-sm text-primary dark:text-primaryLight truncate">
        {item.drawing_title}
      </h4>

      {/* Template info */}
      {item.template_name && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {item.template_category && CATEGORY_ICON[item.template_category]}{' '}
          {item.template_name}
        </p>
      )}

      {/* Effect */}
      {item.template_effect && (
        <p className="text-xs text-primary/80 dark:text-primaryLight/80 mt-1 line-clamp-2 italic">
          {item.template_effect}
        </p>
      )}

      {/* Category & uses */}
      <div className="mt-2 flex items-center justify-between text-xs">
        {item.template_category && (
          <span className="text-gray-500 dark:text-gray-400">
            {CATEGORY_LABEL[item.template_category]}
          </span>
        )}
        <span className={`font-medium ${
          item.uses_remaining === null
            ? 'text-green-600 dark:text-green-400'
            : item.uses_remaining > 0
              ? 'text-accent3'
              : 'text-red-500'
        }`}>
          {item.uses_remaining === null ? '∞' : item.uses_remaining} utilisation{item.uses_remaining !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Session */}
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        Session {item.acquired_at_session}
      </p>
    </div>
  )
}
