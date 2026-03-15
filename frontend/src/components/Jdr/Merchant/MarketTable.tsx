import { useState } from 'react'
import type { MarketPriceItem } from './types'

const CRAFT_TYPES = [
  'Alchimie', 'Couture', 'Cuisine', 'Forge', 'Ingénierie',
  'Joaillerie', 'Menuiserie', 'Tannerie', 'Enchantement',
]

const AVAILABILITIES = ['Abondant', 'Commun', 'Moyen', 'Rare', 'Légendaire']

const availabilityColor: Record<string, string> = {
  Abondant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Commun: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Moyen: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Rare: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Légendaire: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

interface Props {
  items: MarketPriceItem[]
  loading: boolean
  onBuy: (item: MarketPriceItem) => void
}

export default function MarketTable({ items, loading, onBuy }: Props) {
  const [search, setSearch] = useState('')
  const [craftFilter, setCraftFilter] = useState('')
  const [availFilter, setAvailFilter] = useState('')

  const filtered = items.filter((i) => {
    if (search && !i.resource_name.toLowerCase().includes(search.toLowerCase())) return false
    if (craftFilter && i.craft_type !== craftFilter) return false
    if (availFilter && i.availability !== availFilter) return false
    return true
  })

  const trendIcon = (t: string) => {
    if (t === 'up') return <span className="text-red-500">↑</span>
    if (t === 'down') return <span className="text-green-500">↓</span>
    return <span className="text-gray-400">→</span>
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
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
        <select
          value={availFilter}
          onChange={(e) => setAvailFilter(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Toutes raretés</option>
          {AVAILABILITIES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Chargement du marché…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Aucune ressource disponible.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Ressource</th>
                <th className="px-3 py-2 text-left font-medium">Métier</th>
                <th className="px-3 py-2 text-right font-medium">Prix</th>
                <th className="px-3 py-2 text-center font-medium">Tendance</th>
                <th className="px-3 py-2 text-left font-medium">Unité</th>
                <th className="px-3 py-2 text-left font-medium">Rareté</th>
                <th className="px-3 py-2 text-center font-medium">Action</th>
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
                    {parseFloat(item.current_price).toFixed(2)} po
                  </td>
                  <td className="px-3 py-2 text-center text-lg">{trendIcon(item.trend)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.unit}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${availabilityColor[item.availability] ?? ''}`}>
                      {item.availability}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => onBuy(item)}
                      className="btn btn-accent text-xs py-1 px-2"
                    >
                      Acheter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
