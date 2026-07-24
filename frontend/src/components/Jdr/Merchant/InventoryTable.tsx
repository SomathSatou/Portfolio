import { useMemo, useState } from 'react'
import type { MerchantInventoryItem } from './types'

const CRAFT_TYPES = [
  'Alchimie', 'Couture', 'Cuisine', 'Forge', 'Ingénierie',
  'Joaillerie', 'Menuiserie', 'Tannerie', 'Enchantement',
]

interface Props {
  items: MerchantInventoryItem[]
  loading: boolean
  onSell?: (item: MerchantInventoryItem) => void
}

export default function InventoryTable({ items, loading, onSell }: Props) {
  const [search, setSearch] = useState('')
  const [craftFilter, setCraftFilter] = useState('')

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (search && !i.resource_name.toLowerCase().includes(search.toLowerCase())) return false
      if (craftFilter && i.craft_type !== craftFilter) return false
      return true
    })
  }, [items, search, craftFilter])

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Chargement de l'inventaire…</p>
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Inventaire vide.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40 w-48"
        />
        <select
          value={craftFilter}
          onChange={(e) => setCraftFilter(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Tous les métiers</option>
          {CRAFT_TYPES.map((ct) => (
            <option key={ct} value={ct}>{ct}</option>
          ))}
        </select>
      </div>

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
            {filtered.map((item) => (
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

      {filtered.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Aucun résultat.</p>
      )}
    </div>
  )
}
