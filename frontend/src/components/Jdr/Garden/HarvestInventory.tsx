import { useState } from 'react'
import type { InventoryItem } from './types.ts'
import { RARITY_BADGE } from './types.ts'

interface Props {
  items: InventoryItem[]
  loading: boolean
  onSell: (plantId: number, quantity: number) => void
  selling: boolean
}

export default function HarvestInventory({ items, loading, onSell, selling }: Props) {
  const [sellQty, setSellQty] = useState<Record<number, number>>({})

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Chargement de l'inventaire…</p>
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Aucune récolte en stock.</p>
  }

  const totalValue = items.reduce((acc, i) => acc + i.sell_price * i.quantity, 0)

  return (
    <div className="space-y-4">
      <div className="bg-accent2/10 dark:bg-accent2/20 rounded-lg p-3 flex justify-between items-center">
        <span className="text-sm font-medium text-accent2 dark:text-accent1">Valeur totale estimée</span>
        <span className="text-lg font-bold text-accent3">{totalValue.toFixed(2)} po</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
              <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Plante</th>
              <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-center">Qté</th>
              <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Prix/u</th>
              <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Total</th>
              <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Vendre</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const badgeClass = RARITY_BADGE[item.plant_rarity] ?? 'bg-gray-200 text-gray-700'
              const qty = sellQty[item.plant_id] ?? 1
              return (
                <tr key={item.plant_id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.plant_icon}</span>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{item.plant_name}</p>
                        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeClass}`}>
                          {item.plant_rarity}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center font-medium text-gray-800 dark:text-gray-200">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                    {item.sell_price.toFixed(2)} po
                  </td>
                  <td className="py-3 text-right font-medium text-accent3">
                    {(item.sell_price * item.quantity).toFixed(2)} po
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={qty}
                        onChange={(e) => setSellQty((prev) => ({ ...prev, [item.plant_id]: Math.max(1, Math.min(item.quantity, Number(e.target.value))) }))}
                        className="w-14 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-1 text-xs text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                      <button
                        onClick={() => onSell(item.plant_id, qty)}
                        disabled={selling}
                        className="btn btn-accent text-xs py-1 px-2"
                      >
                        Vendre
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
