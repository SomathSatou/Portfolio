import React from 'react'
import api from '../api'
import type { City } from './types'

interface Props {
  campaignId: number
  isMJ: boolean
}

export default function CampaignCitiesPanel({ campaignId, isMJ }: Props) {
  const [cities, setCities] = React.useState<City[]>([])
  const [allCities, setAllCities] = React.useState<City[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showAdd, setShowAdd] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [error, setError] = React.useState('')

  const fetchCities = React.useCallback(async () => {
    try {
      const res = await api.get<City[]>(`/campaigns/${campaignId}/cities/`)
      setCities(res.data)
    } catch {
      setError('Impossible de charger les villes.')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => { fetchCities() }, [fetchCities])

  const loadAllCities = async () => {
    if (allCities.length > 0) {
      setShowAdd(true)
      return
    }
    try {
      const res = await api.get<City[]>('/economy/cities/')
      setAllCities(res.data)
      setShowAdd(true)
    } catch {
      setError('Impossible de charger la liste des villes.')
    }
  }

  const handleAdd = async (cityId: number) => {
    try {
      const res = await api.post<City[]>(`/campaigns/${campaignId}/cities/`, { city_ids: [cityId] })
      setCities(res.data)
    } catch {
      setError('Erreur lors de l\'ajout.')
    }
  }

  const handleRemove = async (cityId: number) => {
    try {
      const res = await api.delete<City[]>(`/campaigns/${campaignId}/cities/`, { data: { city_ids: [cityId] } })
      setCities(res.data)
    } catch {
      setError('Erreur lors du retrait.')
    }
  }

  const campaignCityIds = new Set(cities.map((c) => c.id))
  const availableCities = allCities
    .filter((c) => !campaignCityIds.has(c.id))
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary dark:text-primaryLight">
          Villes ({cities.length})
        </h2>
        {isMJ && (
          <button
            onClick={showAdd ? () => setShowAdd(false) : loadAllCities}
            className="btn btn-primary text-sm"
          >
            {showAdd ? 'Fermer' : '+ Ajouter des villes'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Add cities panel */}
      {showAdd && isMJ && (
        <div className="card space-y-3">
          <input
            type="text"
            placeholder="Rechercher une ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {availableCities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {allCities.length === 0 ? 'Aucune ville dans la base.' : 'Toutes les villes sont déjà ajoutées ou aucun résultat.'}
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {availableCities.map((city) => (
                <div key={city.id} className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{city.name}</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-500">
                      {city.export_count} exports · {city.import_count} imports
                    </span>
                  </div>
                  <button
                    onClick={() => handleAdd(city.id)}
                    className="text-xs text-primary dark:text-primaryLight hover:underline shrink-0"
                  >
                    Ajouter
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaign cities list */}
      {cities.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune ville dans cette campagne.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <div key={city.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{city.name}</h3>
                  <div className="flex gap-2 mt-1 text-xs text-gray-500 dark:text-gray-500">
                    <span>{city.export_count} exports</span>
                    <span>·</span>
                    <span>{city.import_count} imports</span>
                  </div>
                </div>
                {isMJ && (
                  <button
                    onClick={() => handleRemove(city.id)}
                    className="text-xs text-red-500 hover:underline shrink-0"
                  >
                    Retirer
                  </button>
                )}
              </div>
              {city.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{city.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
