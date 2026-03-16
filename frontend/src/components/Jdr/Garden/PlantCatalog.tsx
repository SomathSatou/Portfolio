import { useState } from 'react'
import type { AlchemyPlant } from './types.ts'
import { CATEGORIES, RARITIES } from './types.ts'
import PlantCard from './PlantCard.tsx'

interface Props {
  plants: AlchemyPlant[]
  loading: boolean
  onSelect: (plant: AlchemyPlant) => void
  categoryFilter: string
  rarityFilter: string
  onCategoryChange: (v: string) => void
  onRarityChange: (v: string) => void
}

export default function PlantCatalog({
  plants, loading, onSelect,
  categoryFilter, rarityFilter, onCategoryChange, onRarityChange,
}: Props) {
  const [search, setSearch] = useState('')

  const filtered = plants.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
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
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={rarityFilter}
          onChange={(e) => onRarityChange(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Toutes raretés</option>
          {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Chargement du catalogue…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Aucune plante trouvée.</p>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((plant) => (
            <PlantCard key={plant.id} plant={plant} onClick={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}
