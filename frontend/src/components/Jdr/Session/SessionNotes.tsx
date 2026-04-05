import React from 'react'
import api from '../api'
import type { SessionNote } from '../Dashboard/types'

interface Props {
  campaignId: string | number
  isMJ: boolean
}

export default function SessionNotes({ campaignId, isMJ }: Props) {
  const [privateNote, setPrivateNote] = React.useState<SessionNote | null>(null)
  const [sharedNote, setSharedNote] = React.useState<SessionNote | null>(null)
  const [privateContent, setPrivateContent] = React.useState('')
  const [sharedContent, setSharedContent] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => {
    api.get<SessionNote[]>(`/session-notes/?campaign=${campaignId}`).then((res) => {
      for (const note of res.data) {
        if (note.is_private) {
          setPrivateNote(note)
          setPrivateContent(note.content)
        } else {
          setSharedNote(note)
          setSharedContent(note.content)
        }
      }
    }).catch(() => {})
  }, [campaignId])

  const autoSave = React.useCallback((content: string, isPrivate: boolean) => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const res = await api.patch<SessionNote>('/session-notes/', {
          campaign: campaignId,
          content,
          is_private: isPrivate,
        })
        if (isPrivate) setPrivateNote(res.data)
        else setSharedNote(res.data)
      } catch {
        // silent fail
      } finally {
        setSaving(false)
      }
    }, 1000)
  }, [campaignId])

  const handlePrivateChange = (val: string) => {
    setPrivateContent(val)
    autoSave(val, true)
  }

  const handleSharedChange = (val: string) => {
    setSharedContent(val)
    autoSave(val, false)
  }

  return (
    <div className="space-y-4">
      {/* Private notes (MJ only) */}
      {isMJ && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-primary dark:text-primaryLight">
              🔒 Notes privées
            </h3>
            {saving && <span className="text-[10px] text-gray-400">Sauvegarde…</span>}
          </div>
          <textarea
            rows={6}
            value={privateContent}
            onChange={(e) => handlePrivateChange(e.target.value)}
            placeholder="Notes visibles uniquement par le MJ…"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
          />
          {privateNote && (
            <p className="text-[10px] text-gray-400 mt-1">
              Mis à jour : {new Date(privateNote.updated_at).toLocaleString('fr-FR')}
            </p>
          )}
        </div>
      )}

      {/* Shared notes */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-primary dark:text-primaryLight">
            📋 Notes partagées
          </h3>
          {saving && <span className="text-[10px] text-gray-400">Sauvegarde…</span>}
        </div>
        {isMJ ? (
          <textarea
            rows={6}
            value={sharedContent}
            onChange={(e) => handleSharedChange(e.target.value)}
            placeholder="Notes visibles par tous les joueurs…"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
          />
        ) : (
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap min-h-[4rem]">
            {sharedContent || <span className="text-gray-400">Aucune note partagée.</span>}
          </div>
        )}
        {sharedNote && (
          <p className="text-[10px] text-gray-400 mt-1">
            Mis à jour : {new Date(sharedNote.updated_at).toLocaleString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  )
}
