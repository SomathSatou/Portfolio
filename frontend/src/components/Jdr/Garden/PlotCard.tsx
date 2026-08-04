import type { GardenPlot } from './types.ts'
import { RARITY_COLORS } from './types.ts'
import GrowthProgressBar from './GrowthProgressBar.tsx'

interface Props {
  plot: GardenPlot
  unlockCost: number
  onPlant: (plotId: number) => void
  onHarvest: (plotId: number) => void
  onClear: (plotId: number) => void
  onFertilize?: (plotId: number) => void
  onUnlock?: (plotId: number) => void
}

export default function PlotCard({
  plot,
  unlockCost,
  onPlant,
  onHarvest,
  onClear,
  onFertilize,
  onUnlock,
}: Props) {
  const borderClass = plot.plant_rarity
    ? RARITY_COLORS[plot.plant_rarity] ?? 'border-gray-300 dark:border-gray-700'
    : 'border-gray-300 dark:border-gray-700'

  const statusBg: Record<string, string> = {
    empty: 'bg-gray-50 dark:bg-gray-800/50',
    growing: 'bg-green-50/50 dark:bg-green-900/10',
    ready: 'bg-accent1/10 dark:bg-accent1/10',
    withered: 'bg-red-50/50 dark:bg-red-900/10',
    locked: 'bg-gray-100 dark:bg-gray-800/30',
  }

  return (
    <div
      className={`
        relative rounded-lg border p-2 transition-all duration-200
        ${borderClass} ${statusBg[plot.status] ?? ''}
        ${plot.status === 'ready' ? 'ring-1 ring-accent1/40' : ''}
        ${plot.status === 'withered' ? 'opacity-70' : ''}
        ${plot.status === 'locked' ? 'border-dashed opacity-60' : ''}
      `}
    >
      {/* Plot number badge */}
      <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-accent2 text-white text-[10px] font-bold flex items-center justify-center">
        {plot.plot_number}
      </div>

      {/* Soil / fertilizer info */}
      <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
        {plot.soil_type && plot.soil_type !== 'terreau' && (
          <span className="text-[9px] px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {plot.soil_type}
          </span>
        )}
        {plot.fertilizer && (
          <span className="text-[9px] px-1 py-0.5 rounded-full bg-accent1/30 text-accent2 dark:text-accent1">
            {plot.fertilizer}
          </span>
        )}
      </div>

      {plot.status === 'empty' && (
        <div className="flex flex-col items-center justify-center min-h-[96px] gap-2 pt-3">
          <div className="text-2xl opacity-30">🌱</div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Vide</p>
          <button
            onClick={() => onPlant(plot.id)}
            className="btn btn-accent text-[10px] py-0.5 px-2"
          >
            + Planter
          </button>
        </div>
      )}

      {plot.status === 'growing' && plot.plant_name && (
        <div className="flex flex-col items-center gap-1 min-h-[96px] pt-4">
          <div className="text-2xl">{plot.plant_icon}</div>
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center leading-tight">
            {plot.plant_name}
          </p>
          <GrowthProgressBar
            sessionsGrown={plot.sessions_grown}
            growthTime={plot.plant_growth_time ?? 1}
          />
          <p className="text-[10px] text-gray-400 dark:text-gray-500">En culture…</p>
          {onFertilize && !plot.fertilizer && (
            <button
              onClick={() => onFertilize(plot.id)}
              className="btn btn-outline text-[9px] py-0.5 px-1.5"
            >
              Fertiliser
            </button>
          )}
        </div>
      )}

      {plot.status === 'ready' && plot.plant_name && (
        <div className="flex flex-col items-center gap-1 min-h-[96px] pt-4">
          <div className="text-2xl animate-bounce">{plot.plant_icon}</div>
          <p className="text-xs font-bold text-accent2 dark:text-accent1 text-center leading-tight">
            {plot.plant_name}
          </p>
          <p className="text-[10px] text-accent2 dark:text-accent1 font-medium">
            Prête ! ({plot.plant_yield_amount}×)
          </p>
          <button
            onClick={() => onHarvest(plot.id)}
            className="btn btn-primary text-[10px] py-0.5 px-2"
          >
            Récolter
          </button>
          {onFertilize && !plot.fertilizer && (
            <button
              onClick={() => onFertilize(plot.id)}
              className="btn btn-outline text-[9px] py-0.5 px-1.5"
            >
              Fertiliser
            </button>
          )}
        </div>
      )}

      {plot.status === 'withered' && (
        <div className="flex flex-col items-center gap-1 min-h-[96px] pt-4">
          <div className="text-2xl grayscale">🥀</div>
          <p className="text-xs font-medium text-red-500 dark:text-red-400 text-center leading-tight">
            {plot.plant_name ?? 'Plante flétrie'}
          </p>
          <p className="text-[10px] text-red-400 dark:text-red-500">Flétrie</p>
          <button
            onClick={() => onClear(plot.id)}
            className="btn btn-outline text-[10px] py-0.5 px-2 border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Nettoyer
          </button>
        </div>
      )}

      {plot.status === 'locked' && (
        <div className="flex flex-col items-center justify-center min-h-[96px] gap-1 pt-3">
          <div className="text-2xl opacity-40 grayscale">🔒</div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Verrouillée</p>
          <p className="text-[10px] text-accent2 dark:text-accent1 font-medium">
            {unlockCost} plantes
          </p>
          {onUnlock && (
            <button
              onClick={() => onUnlock(plot.id)}
              className="btn btn-outline text-[9px] py-0.5 px-1.5 border-accent2 text-accent2 hover:bg-accent2/10"
            >
              Débloquer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
