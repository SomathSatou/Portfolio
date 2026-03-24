import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import CharacterCard from './CharacterCard'
import type { Character } from './types'

export default function CharactersListPage() {
  const { user } = useAuth()
  const [characters, setCharacters] = React.useState<Character[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<Character[]>('/characters/')
      .then((res) => {
        if (!cancelled) setCharacters(res.data)
      })
      .catch(() => {
        // silent
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const myCharacters = characters.filter((c) => c.player === user?.id)
  const otherCharacters = characters.filter((c) => c.player !== user?.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Personnages</h1>
        <a href="#/jdr/character/new" className="btn btn-primary text-sm">+ Créer un personnage</a>
      </div>

      {/* My characters */}
      <div>
        <h2 className="text-lg font-semibold text-primary dark:text-primaryLight mb-3">
          Mes personnages ({myCharacters.length})
        </h2>
        {myCharacters.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucun personnage pour le moment.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myCharacters.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>
        )}
      </div>

      {/* Other characters (visible to MJ) */}
      {otherCharacters.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-primary dark:text-primaryLight mb-3">
            Autres personnages ({otherCharacters.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {otherCharacters.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
