import { useState } from 'react'
import type { City } from '../Dashboard/types'
import CitySelector from './CitySelector.tsx'

interface Props {
  resourceName: string
  quantity: number
  buyCost: string
  cities: City[]
  onConfirm: (sellCityId: number) => void
  onClose: () => void
  loading: boolean
}

export default function SellModal({ resourceName, quantity, buyCost, cities, onConfirm, onClose, loading }: Props) {
  const [sellCityId, setSellCityId] = useState<number | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-primary dark:text-primaryLight mb-4">
          Vendre {resourceName}
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Quantité</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{quantity}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Coût d'achat total</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">
              {parseFloat(buyCost).toFixed(2)} po
            </span>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <CitySelector
              cities={cities}
              selectedId={sellCityId}
              onChange={setSellCityId}
              label="Ville de vente"
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            Le prix de vente sera calculé selon le marché de la ville choisie.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline text-xs">
            Annuler
          </button>
          <button
            onClick={() => sellCityId && onConfirm(sellCityId)}
            disabled={loading || !sellCityId}
            className="btn btn-accent text-xs"
          >
            {loading ? 'Vente…' : 'Confirmer la vente'}
          </button>
        </div>
      </div>
    </div>
  )
}
