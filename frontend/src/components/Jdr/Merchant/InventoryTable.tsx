import type { MerchantInventoryItem } from './types'

interface Props {
  items: MerchantInventoryItem[]
  loading: boolean
  onSell?: (item: MerchantInventoryItem) => void
}

export default function InventoryTable({ items, loading, onSell }: Props) {
  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Chargement de l'inventaire…</p>
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Inventaire vide.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Ressource</th>
            <th className="px-3 py-2 text-left font-medium">Métier</th>
            <th className="px-3 py-2 text-right font-medium">Quantité</th>
            <th className="px-3 py-2 text-left font-medium">Unité</th>
            <th className="px-3 py-2 text-right font-medium">Prix moyen d'achat</th>
            {onSell && <th className="px-3 py-2 text-center font-medium">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                {item.resource_name}
              </td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.craft_type}</td>
              <td className="px-3 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                {item.quantity}
              </td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.resource_unit}</td>
              <td className="px-3 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                {parseFloat(item.average_buy_price).toFixed(2)} po
              </td>
              {onSell && (
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onSell(item)}
                    className="btn btn-accent text-xs py-1 px-2"
                  >
                    Vendre
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
