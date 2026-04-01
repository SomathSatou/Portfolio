import { useCallback, useEffect, useState } from 'react'
import api from '../api.ts'
import CitySelector from './CitySelector.tsx'
import type { City, MerchantInventoryItem } from './types'

interface Props {
  item: MerchantInventoryItem
  cities: City[]
  campaignId: number
  onConfirm: (data: { resource_id: number; quantity: number; sell_city_id: number }) => void
  onClose: () => void
  loading: boolean
}

export default function SellFromInventoryModal({
  item,
  cities,
  campaignId,
  onConfirm,
  onClose,
  loading,
}: Props) {
  const [sellCityId, setSellCityId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [sellPriceUnit, setSellPriceUnit] = useState<number | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)

  const avgBuyPrice = parseFloat(item.average_buy_price)

  // Fetch sell price estimate when city changes
  const fetchEstimate = useCallback(async () => {
    if (!sellCityId) {
      setSellPriceUnit(null)
      return
    }
    setEstimateLoading(true)
    try {
      const res = await api.get<{ sell_price_unit: string }>('/merchant/sell-estimate/', {
        params: { resource_id: item.resource, sell_city_id: sellCityId, campaign_id: campaignId },
      })
      setSellPriceUnit(parseFloat(res.data.sell_price_unit))
    } catch {
      setSellPriceUnit(null)
    } finally {
      setEstimateLoading(false)
    }
  }, [sellCityId, item.resource, campaignId])

  useEffect(() => {
    void fetchEstimate()
  }, [fetchEstimate])

  const totalRevenue = sellPriceUnit !== null ? sellPriceUnit * quantity : null
  const totalCost = avgBuyPrice * quantity
  const profit = totalRevenue !== null ? totalRevenue - totalCost : null
  const isProfitable = profit !== null && profit >= 0

  const handleQuantityChange = (val: number) => {
    setQuantity(Math.max(1, Math.min(item.quantity, val)))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-primary dark:text-primaryLight mb-4">
          Vendre depuis l'inventaire
        </h3>

        {/* Resource info */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Ressource</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{item.resource_name}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Quantité disponible</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">
              {item.quantity} {item.resource_unit}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Prix moyen d'achat</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">
              {avgBuyPrice.toFixed(2)} po / {item.resource_unit}
            </span>
          </div>

          {/* City selector */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <CitySelector
              cities={cities}
              selectedId={sellCityId}
              onChange={setSellCityId}
              label="Ville de vente"
            />
          </div>

          {/* Sell price estimate */}
          {sellCityId && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Prix de vente unitaire</span>
              {estimateLoading ? (
                <span className="text-xs text-gray-400 italic">Estimation…</span>
              ) : sellPriceUnit !== null ? (
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {sellPriceUnit.toFixed(2)} po / {item.resource_unit}
                </span>
              ) : (
                <span className="text-xs text-red-500">Indisponible</span>
              )}
            </div>
          )}

          {/* Quantity selector */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 dark:text-gray-400">Quantité à vendre</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={item.quantity}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-16 text-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  +
                </button>
              </div>
            </div>
            {item.quantity > 1 && (
              <input
                type="range"
                min={1}
                max={item.quantity}
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            )}
          </div>

          {/* Revenue / profit summary */}
          {sellPriceUnit !== null && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Revenu total estimé</span>
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {totalRevenue!.toFixed(2)} po
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Coût d'achat total</span>
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

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline text-xs">
            Annuler
          </button>
          <button
            onClick={() =>
              sellCityId &&
              onConfirm({ resource_id: item.resource, quantity, sell_city_id: sellCityId })
            }
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
