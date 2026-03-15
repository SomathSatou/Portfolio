import { useState } from 'react'
import type { MarketPriceItem } from './types'

interface Props {
  item: MarketPriceItem
  onConfirm: (quantity: number) => void
  onClose: () => void
  loading: boolean
}

export default function BuyModal({ item, onConfirm, onClose, loading }: Props) {
  const [qty, setQty] = useState(1)
  const unitPrice = parseFloat(item.current_price)
  const total = (unitPrice * qty).toFixed(2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-primary dark:text-primaryLight mb-4">
          Acheter {item.resource_name}
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Prix unitaire</span>
            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
              {unitPrice.toFixed(2)} po / {item.unit}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Quantité</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                +
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
            <span className="font-medium text-gray-900 dark:text-gray-100">Total</span>
            <span className="font-mono font-bold text-lg text-primary dark:text-primaryLight">
              {total} po
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline text-xs">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(qty)}
            disabled={loading}
            className="btn btn-accent text-xs"
          >
            {loading ? 'Achat…' : 'Confirmer l\'achat'}
          </button>
        </div>
      </div>
    </div>
  )
}
