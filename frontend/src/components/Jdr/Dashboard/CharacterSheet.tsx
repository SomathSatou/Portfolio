import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import StatsEditor from './StatsEditor'
import type { Character } from './types'

interface CharacterSheetProps {
  characterId: string
}

export default function CharacterSheet({ characterId }: CharacterSheetProps) {
  const { user } = useAuth()
  const [character, setCharacter] = React.useState<Character | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [successMsg, setSuccessMsg] = React.useState('')

  // Editable fields
  const [description, setDescription] = React.useState('')
  const [level, setLevel] = React.useState(1)
  const [stats, setStats] = React.useState<Record<string, number | string>>({})

  const isMJ = user?.role === 'mj'
  const isOwner = character?.player === user?.id
  const canEdit = isOwner || isMJ

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .get<Character>(`/characters/${characterId}/`)
      .then((res) => {
        if (cancelled) return
        setCharacter(res.data)
        setDescription(res.data.description)
        setLevel(res.data.level)
        setStats(res.data.stats ?? {})
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le personnage.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [characterId])

  const handleSave = async () => {
    if (!character) return
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      const payload: Partial<Character> = { description, stats }
      if (isMJ) {
        payload.level = level
      }
      const res = await api.patch<Character>(`/characters/${character.id}/`, payload)
      setCharacter(res.data)
      setSuccessMsg('Personnage sauvegardé.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>
    )
  }

  if (error && !character) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500">{error}</p>
        <a href="#/jdr/dashboard" className="btn btn-outline mt-4">
          Retour au dashboard
        </a>
      </div>
    )
  }

  if (!character) return null

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <a href="#/jdr/dashboard" className="hover:underline">Dashboard</a>
        <span className="mx-2">/</span>
        <a href={`#/jdr/campaign/${character.campaign}`} className="hover:underline">{character.campaign_name}</a>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">{character.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4">
            {character.avatar ? (
              <img
                src={character.avatar}
                alt={character.name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-primaryLight/40"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-primary dark:text-primaryLight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">{character.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {character.class_type || 'Classe inconnue'} — Joueur : {character.player_name}
              </p>
            </div>
          </div>

          {/* Level */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Niveau</label>
            {canEdit && isMJ ? (
              <input
                type="number"
                min={1}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <span className="text-lg font-semibold text-accent3">{character.level}</span>
            )}
          </div>

          {/* Description */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            {canEdit ? (
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {character.description || 'Aucune description.'}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="card">
            <h2 className="text-lg font-semibold text-primary dark:text-primaryLight mb-3">Statistiques</h2>
            <StatsEditor stats={stats} editable={canEdit} onChange={setStats} />
          </div>

          {/* Save button */}
          {canEdit && (
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
              {successMsg && <span className="text-sm text-green-600">{successMsg}</span>}
              {error && <span className="text-sm text-red-500">{error}</span>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="card h-fit space-y-3">
          <h3 className="font-semibold text-primary dark:text-primaryLight">Infos</h3>
          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Campagne</dt>
              <dd>
                <a href={`#/jdr/campaign/${character.campaign}`} className="hover:underline">
                  {character.campaign_name}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Classe</dt>
              <dd className="text-gray-900 dark:text-gray-100">{character.class_type || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Niveau</dt>
              <dd className="text-gray-900 dark:text-gray-100">{character.level}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Joueur</dt>
              <dd className="text-gray-900 dark:text-gray-100">{character.player_name}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Créé le</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {new Date(character.created_at).toLocaleDateString('fr-FR')}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
