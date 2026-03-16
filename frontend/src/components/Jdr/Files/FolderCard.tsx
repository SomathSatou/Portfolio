import type { SharedFolder } from './types'
import { CATEGORY_ICON, CATEGORY_LABEL, ACCESS_LEVEL_BADGE, ACCESS_LEVEL_LABEL } from './types'

interface FolderCardProps {
  folder: SharedFolder
  onClick: (folder: SharedFolder) => void
  onEdit?: (folder: SharedFolder) => void
  onDelete?: (folder: SharedFolder) => void
  isMJ: boolean
}

export default function FolderCard({ folder, onClick, onEdit, onDelete, isMJ }: FolderCardProps) {
  return (
    <div
      className="card cursor-pointer hover:shadow-md transition-shadow group relative"
      onClick={() => onClick(folder)}
    >
      {/* MJ actions */}
      {isMJ && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(folder) }}
              className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary dark:hover:text-primaryLight transition-colors"
              title="Modifier"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(folder) }}
              className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
              title="Supprimer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Icon + category */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl" role="img" aria-label={CATEGORY_LABEL[folder.category]}>
          {CATEGORY_ICON[folder.category]}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">{folder.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{CATEGORY_LABEL[folder.category]}</p>
        </div>
      </div>

      {/* Description */}
      {folder.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {folder.description}
        </p>
      )}

      {/* Access badge */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACCESS_LEVEL_BADGE[folder.access_level]}`}>
          {ACCESS_LEVEL_LABEL[folder.access_level]}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(folder.created_at).toLocaleDateString('fr-FR')}
        </span>
      </div>
    </div>
  )
}
