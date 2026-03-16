import type { GardenPlot } from './types.ts'
import PlotCard from './PlotCard.tsx'

interface Props {
  plots: GardenPlot[]
  onPlant: (plotId: number) => void
  onHarvest: (plotId: number) => void
  onClear: (plotId: number) => void
}

export default function GardenGrid({ plots, onPlant, onHarvest, onClear }: Props) {
  if (plots.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
        Aucune parcelle disponible.
      </p>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {plots.map((plot) => (
        <PlotCard
          key={plot.id}
          plot={plot}
          onPlant={onPlant}
          onHarvest={onHarvest}
          onClear={onClear}
        />
      ))}
    </div>
  )
}
