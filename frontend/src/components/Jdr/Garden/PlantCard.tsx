import type { AlchemyPlant } from './types.ts'
import { RARITY_BADGE, RARITY_COLORS } from './types.ts'

interface Props {
  plant: AlchemyPlant
  onClick: (plant: AlchemyPlant) => void
}

export default function PlantCard({ plant, onClick }: Props) {
  const borderClass = RARITY_COLORS[plant.rarity] ?? 'border-gray-300 dark:border-gray-700'
  const badgeClass = RARITY_BADGE[plant.rarity] ?? 'bg-gray-200 text-gray-700'

  return (
    <button
      onClick={() => onClick(plant)}
      className={`
        text-left rounded-xl border-2 p-4 transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5 cursor-pointer
        bg-white dark:bg-gray-800/60
        ${borderClass}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{plant.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
            {plant.name}
          </h4>
          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 ${badgeClass}`}>
            {plant.rarity}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Catégorie</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{plant.category}</span>
        </div>
        <div className="flex justify-between">
          <span>Culture</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{plant.growth_time} session{plant.growth_time > 1 ? 's' : ''}</span>
        </div>
        <div className="flex justify-between">
          <span>Rendement</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">×{plant.yield_amount}</span>
        </div>
        <div className="flex justify-between">
          <span>Prix</span>
          <span className="font-medium text-accent3">{plant.sell_price} po</span>
        </div>
      </div>

      {plant.special_conditions && (
        <p className="mt-2 text-[10px] italic text-amber-600 dark:text-amber-400 leading-tight">
          ⚠ {plant.special_conditions}
        </p>
      )}
    </button>
  )
}
