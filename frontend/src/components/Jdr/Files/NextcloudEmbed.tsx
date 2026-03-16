import React from 'react'
import api from '../api'

interface NextcloudEmbedProps {
  folderId?: number
}

export default function NextcloudEmbed({ folderId }: NextcloudEmbedProps) {
  const [embedUrl, setEmbedUrl] = React.useState('')
  const [nextcloudUrl, setNextcloudUrl] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [iframeError, setIframeError] = React.useState(false)

  React.useEffect(() => {
    setLoading(true)
    setError('')
    setIframeError(false)

    const params = folderId ? `?folder=${folderId}` : ''
    api.get<{ embed_url: string; nextcloud_url: string }>(`/files/embed-url/${params}`)
      .then((res) => {
        setEmbedUrl(res.data.embed_url)
        setNextcloudUrl(res.data.nextcloud_url)
      })
      .catch(() => {
        setError('Impossible de charger l\'URL Nextcloud.')
      })
      .finally(() => setLoading(false))
  }, [folderId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg gap-3">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        {nextcloudUrl && (
          <a
            href={nextcloudUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline text-sm"
          >
            Ouvrir Nextcloud dans un nouvel onglet
          </a>
        )}
      </div>
    )
  }

  if (iframeError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg gap-3">
        <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          L&apos;iframe Nextcloud est bloquée par votre navigateur.
        </p>
        <a
          href={embedUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary text-sm"
        >
          Ouvrir Nextcloud dans un nouvel onglet
        </a>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nextcloud</span>
        <a
          href={embedUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary dark:text-primaryLight hover:underline"
        >
          Ouvrir dans un nouvel onglet
        </a>
      </div>

      <iframe
        src={embedUrl}
        className="w-full border-0"
        style={{ height: 'calc(100vh - 16rem)' }}
        title="Nextcloud"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        onError={() => setIframeError(true)}
      />
    </div>
  )
}
