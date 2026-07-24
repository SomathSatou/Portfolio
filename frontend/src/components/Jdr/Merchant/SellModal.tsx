import { useCallback, useEffect, useState } from 'react'
import api from '../api.ts'
import type { City } from '../Dashboard/types'
import CitySelector from './CitySelector.tsx'

interface Props {
  resourceName: string
  resourceId: number
  maxQuantity: number
  buyCost: string
  campaignId: number
  cities: City[]
  onConfirm: (sellCityId: number, quantity: number) => void
  onClose: () => void
  loading: boolean
}

export default function SellModal({
  resourceName,
  resourceId,
  maxQuantity,
  buyCost,
  campaignId,
  cities,
  onConfirm,
  onClose,
  loading,
}: Props) {
  const [sellCityId, setSellCityId] = useState<number | null>(null)
  const [sellQty, setSellQty] = useState(maxQuantity)
  const [sellPriceUnit, setSellPriceUnit] = useState<number | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)

  const unitCost = parseFloat(buyCost) / maxQuantity

  const fetchEstimate = useCallback(async () => {
    if (!sellCityId) {
      setSellPriceUnit(null)
      return
    }
    setEstimateLoading(true)
    try {
      const res = await api.get<{ sell_price_unit: string }>('/merchant/sell-estimate/', {
        params: { resource_id: resourceId, sell_city_id: sellCityId, campaign_id: campaignId },
      })
      setSellPriceUnit(parseFloat(res.data.sell_price_unit))
    } catch {
      setSellPriceUnit(null)
    } finally {
      setEstimateLoading(false)
    }
  }, [sellCityId, resourceId, campaignId])

  useEffect(() => {
    void fetchEstimate()
  }, [fetchEstimate])

  const handleQuantityChange = (val: number) => {
    setSellQty(Math.max(1, Math.min(maxQuantity, val)))
  }

  const totalRevenue = sellPriceUnit !== null ? sellPriceUnit * sellQty : null
  const totalCost = unitCost * sellQty
  const profit = totalRevenue !== null ? totalRevenue - totalCost : null
  const isProfitable = profit !== null && profit >= 0

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
            <span className="text-gray-600 dark:text-gray-400">Quantité disponible</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{maxQuantity}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Coût d'achat total</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">
              {parseFloat(buyCost).toFixed(2)} po
            </span>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Quantité à vendre
              </label>
              <input
                type="number"
                min={1}
                max={maxQuantity}
                value={sellQty}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <CitySelector
              cities={cities}
              selectedId={sellCityId}
              onChange={setSellCityId}
              label="Ville de vente"
            />
          </div>

          {sellCityId && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Prix de vente unitaire</span>
              {estimateLoading ? (
                <span className="text-xs text-gray-400 italic">Estimation…</span>
              ) : sellPriceUnit !== null ? (
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {sellPriceUnit.toFixed(2)} po
                </span>
              ) : (
                <span className="text-xs text-red-500">Indisponible</span>
              )}
            </div>
          )}

          {sellPriceUnit !== null && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Revenu total estimé</span>
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {totalRevenue!.toFixed(2)} po
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Coût d'achat partiel</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {totalCost.toFixed(2)} po
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900 dark:text-gray-100">Profit estimé</span>
                <span
                  className={`font-mono font-bold text-lg ${
                    isProfitable
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {isProfitable ? '+' : ''}{profit!.toFixed(2)} po
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline text-xs">
            Annuler
          </button>
          <button
            onClick={() => sellCityId && onConfirm(sellCityId, sellQty)}
            disabled={loading || !sellCityId || sellPriceUnit === null || estimateLoading}
            className="btn btn-accent text-xs"
          >
            {loading ? 'Vente…' : 'Confirmer la vente'}
          </button>
        </div>
      </div>
    </div>
  )
}
