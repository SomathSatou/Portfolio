import React from 'react'
import api from '../api'
import type { FolderContentResponse, NextcloudFile, SharedFolder } from './types'
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

function fileIcon(file: NextcloudFile): string {
  if (file.is_directory) return '📁'
  const ct = file.content_type || ''
  const name = file.name.toLowerCase()
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
      .catch((err) => {
        if (err.response?.status === 503) {
          setError('Nextcloud non configuré. Les fichiers ne sont pas disponibles en mode développement.')
        } else {
          setError('Impossible de charger le contenu du dossier.')
        }
      })
      .finally(() => setLoading(false))
  }, [folder.id])

  React.useEffect(() => {
    fetchContent()
  }, [fetchContent])

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
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{folder.nextcloud_path}</p>
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
                <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Modifié</th>
              </tr>
            </thead>
            <tbody>
              {content.files.map((file, idx) => (
                <FileRow key={file.href || idx} file={file} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function FileRow({ file }: { file: NextcloudFile }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg flex-shrink-0">{fileIcon(file)}</span>
          <span className="text-gray-900 dark:text-gray-100 truncate">{file.name}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
        {file.is_directory ? 'Dossier' : (file.content_type || '—')}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
        {file.is_directory ? '—' : formatFileSize(file.size)}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 hidden md:table-cell">
        {file.last_modified
          ? new Date(file.last_modified).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—'}
      </td>
    </tr>
  )
}
