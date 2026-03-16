import { useEffect, useState } from 'react'
import api from '../api.ts'
import type { AlchemyPlantDetail } from './types.ts'
import { RARITY_BADGE } from './types.ts'

interface Props {
  plantId: number
  hasEmptyPlot: boolean
  onPlant: (plantId: number) => void
  onClose: () => void
  planting: boolean
}

export default function PlantModal({ plantId, hasEmptyPlot, onPlant, onClose, planting }: Props) {
  const [plant, setPlant] = useState<AlchemyPlantDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get<AlchemyPlantDetail>(`/garden/plants/${plantId}/`)
      .then((res) => { if (!cancelled) setPlant(res.data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [plantId])

  const badgeClass = plant ? (RARITY_BADGE[plant.rarity] ?? 'bg-gray-200 text-gray-700') : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">Chargement…</p>
        ) : !plant ? (
          <p className="text-center text-red-500 py-8">Plante introuvable.</p>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl">{plant.icon}</div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{plant.name}</h2>
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
                  {plant.rarity}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed italic">
              {plant.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Catégorie</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{plant.category}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Temps de culture</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{plant.growth_time} session{plant.growth_time > 1 ? 's' : ''}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Rendement</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">×{plant.yield_amount}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Prix de vente</p>
                <p className="font-medium text-accent3">{plant.sell_price} po</p>
              </div>
            </div>

            {plant.special_conditions && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠ {plant.special_conditions}
                </p>
              </div>
            )}

            {plant.origin_city_name && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Origine : <span className="font-medium">{plant.origin_city_name}</span>
              </p>
            )}

            {plant.usages.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Utilisations</h3>
                <div className="space-y-1">
                  {plant.usages.map((u) => (
                    <div key={u.id} className="flex justify-between text-xs bg-gray-50 dark:bg-gray-800 rounded-md px-3 py-1.5">
                      <span className="text-gray-700 dark:text-gray-300">{u.recipe_name}</span>
                      <span className="text-gray-500 dark:text-gray-400">×{u.quantity_needed}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
              <button onClick={onClose} className="btn btn-outline text-sm py-1.5 px-4">
                Fermer
              </button>
              {hasEmptyPlot && (
                <button
                  onClick={() => onPlant(plant.id)}
                  disabled={planting}
                  className="btn btn-primary text-sm py-1.5 px-4"
                >
                  {planting ? 'Plantation…' : 'Planter'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
