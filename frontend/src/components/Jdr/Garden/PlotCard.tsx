import type { GardenPlot } from './types.ts'
import { RARITY_COLORS } from './types.ts'
import GrowthProgressBar from './GrowthProgressBar.tsx'

interface Props {
  plot: GardenPlot
  onPlant: (plotId: number) => void
  onHarvest: (plotId: number) => void
  onClear: (plotId: number) => void
}

export default function PlotCard({ plot, onPlant, onHarvest, onClear }: Props) {
  const borderClass = plot.plant_rarity
    ? RARITY_COLORS[plot.plant_rarity] ?? 'border-gray-300 dark:border-gray-700'
    : 'border-gray-300 dark:border-gray-700'

  const statusBg: Record<string, string> = {
    empty: 'bg-gray-50 dark:bg-gray-800/50',
    growing: 'bg-green-50/50 dark:bg-green-900/10',
    ready: 'bg-accent1/10 dark:bg-accent1/10',
    withered: 'bg-red-50/50 dark:bg-red-900/10',
  }

  return (
    <div
      className={`
        relative rounded-xl border-2 p-4 transition-all duration-200
        ${borderClass} ${statusBg[plot.status] ?? ''}
        ${plot.status === 'ready' ? 'ring-2 ring-accent1/40 shadow-lg shadow-accent1/10' : ''}
        ${plot.status === 'withered' ? 'opacity-70' : ''}
      `}
    >
      {/* Plot number badge */}
      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-accent2 text-white text-xs font-bold flex items-center justify-center shadow">
        {plot.plot_number}
      </div>

      {plot.status === 'empty' && (
        <div className="flex flex-col items-center justify-center min-h-[120px] gap-3">
          <div className="text-3xl opacity-30">🌱</div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Parcelle vide</p>
          <button
            onClick={() => onPlant(plot.id)}
            className="btn btn-accent text-xs py-1 px-3"
          >
            + Planter
          </button>
        </div>
      )}

      {plot.status === 'growing' && plot.plant_name && (
        <div className="flex flex-col items-center gap-2 min-h-[120px]">
          <div className="text-3xl">{plot.plant_icon}</div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center">
            {plot.plant_name}
          </p>
          <GrowthProgressBar
            sessionsGrown={plot.sessions_grown}
            growthTime={plot.plant_growth_time ?? 1}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">En culture…</p>
        </div>
      )}

      {plot.status === 'ready' && plot.plant_name && (
        <div className="flex flex-col items-center gap-2 min-h-[120px]">
          <div className="text-3xl animate-bounce">{plot.plant_icon}</div>
          <p className="text-sm font-bold text-accent2 dark:text-accent1 text-center">
            {plot.plant_name}
          </p>
          <p className="text-xs text-accent2 dark:text-accent1 font-medium">
            Prête ! ({plot.plant_yield_amount}×)
          </p>
          <button
            onClick={() => onHarvest(plot.id)}
            className="btn btn-primary text-xs py-1 px-3"
          >
            Récolter
          </button>
        </div>
      )}

      {plot.status === 'withered' && (
        <div className="flex flex-col items-center gap-2 min-h-[120px]">
          <div className="text-3xl grayscale">🥀</div>
          <p className="text-sm font-medium text-red-500 dark:text-red-400 text-center">
            {plot.plant_name ?? 'Plante flétrie'}
          </p>
          <p className="text-xs text-red-400 dark:text-red-500">Flétrie</p>
          <button
            onClick={() => onClear(plot.id)}
            className="btn btn-outline text-xs py-1 px-3 border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Nettoyer
          </button>
        </div>
      )}
    </div>
  )
}
