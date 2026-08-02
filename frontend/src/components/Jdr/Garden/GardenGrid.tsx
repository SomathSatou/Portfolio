import type { GardenPlot } from './types.ts'
import PlotCard from './PlotCard.tsx'

interface Props {
  plots: GardenPlot[]
  gridColumns: number
  onPlant: (plotId: number) => void
  onHarvest: (plotId: number) => void
  onClear: (plotId: number) => void
  onFertilize?: (plotId: number) => void
}

export default function GardenGrid({
  plots,
  gridColumns,
  onPlant,
  onHarvest,
  onClear,
  onFertilize,
}: Props) {
  if (plots.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
        Aucune parcelle disponible.
      </p>
    )
  }

  const sortedPlots = [...plots].sort((a, b) => a.plot_number - b.plot_number)
  const columns = Math.max(gridColumns, 1)

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {sortedPlots.map((plot) => (
        <PlotCard
          key={plot.id}
          plot={plot}
          onPlant={onPlant}
          onHarvest={onHarvest}
          onClear={onClear}
          onFertilize={onFertilize}
        />
      ))}
    </div>
  )
}
