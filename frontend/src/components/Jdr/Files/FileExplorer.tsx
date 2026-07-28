import React from 'react'
import api from '../api'
import type { FolderContentResponse, SharedFile, SharedFolder } from './types'
import FileUpload from './FileUpload'

interface FileExplorerProps {
  folder: SharedFolder
  onBack: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—'
  const units = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function fileIcon(file: SharedFile): string {
  const ct = file.content_type || ''
  const name = file.original_name.toLowerCase()
  if (ct.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(name)) return '🖼️'
  if (ct.startsWith('audio/') || /\.(mp3|ogg|wav|flac|m4a)$/.test(name)) return '🎵'
  if (ct.startsWith('video/') || /\.(mp4|webm|avi|mkv)$/.test(name)) return '🎬'
  if (ct === 'application/pdf' || name.endsWith('.pdf')) return '📄'
  if (/\.(doc|docx|odt|rtf|txt|md)$/.test(name)) return '📝'
  if (/\.(xls|xlsx|ods|csv)$/.test(name)) return '📊'
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return '📦'
  return '📎'
}

export default function FileExplorer({ folder, onBack }: FileExplorerProps) {
  const [content, setContent] = React.useState<FolderContentResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  const fetchContent = React.useCallback(() => {
    setLoading(true)
    setError('')
    api.get<FolderContentResponse>(`/files/folders/${folder.id}/content/`)
      .then((res) => setContent(res.data))
      .catch(() => {
        setError('Impossible de charger le contenu du dossier.')
      })
      .finally(() => setLoading(false))
  }, [folder.id])

  React.useEffect(() => {
    fetchContent()
  }, [fetchContent])

  async function handleDelete(file: SharedFile) {
    if (!confirm(`Supprimer "${file.original_name}" ?`)) return
    try {
      await api.delete(`/files/${file.id}/`)
      fetchContent()
    } catch {
      setError('Erreur lors de la suppression du fichier.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Retour"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{folder.name}</h2>
          {folder.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{folder.description}</p>
          )}
        </div>
      </div>

      {/* Upload zone (if user can upload) */}
      {content?.can_upload && (
        <FileUpload folderId={folder.id} onUploadComplete={fetchContent} />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      ) : error ? (
        <div className="card text-center py-8">
          <svg className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      ) : content && content.files.length === 0 ? (
        <div className="card text-center py-8">
          <svg className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">Dossier vide</p>
        </div>
      ) : content ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Nom</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Type</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Taille</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Ajouté</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {content.files.map((file) => (
                <FileRow key={file.id} file={file} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function FileRow({ file, onDelete }: { file: SharedFile; onDelete: (file: SharedFile) => void }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-2.5">
        <a
          href={file.url ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 hover:underline"
        >
          <span className="text-lg flex-shrink-0">{fileIcon(file)}</span>
          <span className="text-gray-900 dark:text-gray-100 truncate">{file.original_name}</span>
        </a>
      </td>
      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
        {file.content_type || '—'}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
        {formatFileSize(file.size)}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 hidden md:table-cell">
        {new Date(file.uploaded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-4 py-2.5 text-right">
        <button
          onClick={() => onDelete(file)}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Supprimer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </td>
    </tr>
  )
}
