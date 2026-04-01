import { useState } from 'react'
import type { City, MerchantInventoryItem } from './types.ts'
import CitySelector from './CitySelector.tsx'
import InventoryTable from './InventoryTable.tsx'

interface Props {
  items: MerchantInventoryItem[]
  loading: boolean
  cities: City[]
  onSellConfirm: (inventoryItemId: number, sellCityId: number, quantity: number) => Promise<void>
}

export default function SellPanel({ items, loading, cities, onSellConfirm }: Props) {
  const [sellItem, setSellItem] = useState<MerchantInventoryItem | null>(null)
  const [sellCityId, setSellCityId] = useState<number | null>(null)
  const [sellQty, setSellQty] = useState(1)
  const [modalLoading, setModalLoading] = useState(false)

  const openModal = (item: MerchantInventoryItem) => {
    setSellItem(item)
    setSellCityId(null)
    setSellQty(item.quantity)
  }

  const closeModal = () => {
    setSellItem(null)
    setSellCityId(null)
    setSellQty(1)
  }

  const handleConfirm = async () => {
    if (!sellItem || !sellCityId || sellQty < 1) return
    setModalLoading(true)
    try {
      await onSellConfirm(sellItem.id, sellCityId, sellQty)
      closeModal()
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <>
      <InventoryTable items={items} loading={loading} onSell={openModal} />

      {sellItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-primary dark:text-primaryLight mb-4">
              Vendre {sellItem.resource_name}
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Stock disponible</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {sellItem.quantity} {sellItem.resource_unit}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Prix moyen d'achat</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {parseFloat(sellItem.average_buy_price).toFixed(2)} po/{sellItem.resource_unit}
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
                    max={sellItem.quantity}
                    value={sellQty}
                    onChange={(e) => setSellQty(Math.max(1, Math.min(sellItem.quantity, Number(e.target.value))))}
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

              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Le prix de vente sera calculé selon le marché de la ville choisie.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeModal} className="btn btn-outline text-xs">
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={modalLoading || !sellCityId || sellQty < 1}
                className="btn btn-accent text-xs"
              >
                {modalLoading ? 'Vente…' : 'Confirmer la vente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
