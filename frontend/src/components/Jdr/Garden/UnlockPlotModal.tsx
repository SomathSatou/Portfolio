import { useState } from 'react'
import type { InventoryItem } from './types.ts'
import { RARITY_BADGE } from './types.ts'

interface Props {
  plotId: number
  plotNumber: number
  unlockCost: number
  inventory: InventoryItem[]
  onUnlock: (plotId: number, plantId: number) => void
  onClose: () => void
  unlocking: boolean
}

export default function UnlockPlotModal({
  plotId,
  plotNumber,
  unlockCost,
  inventory,
  onUnlock,
  onClose,
  unlocking,
}: Props) {
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null)

  const eligible = inventory.filter((item) => item.quantity >= unlockCost)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          Débloquer la parcelle {plotNumber}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Coût : <span className="font-semibold text-accent2">{unlockCost} plantes</span>.
          Choisissez une plante de votre inventaire :
        </p>

        {eligible.length === 0 ? (
          <p className="text-sm text-red-500 text-center py-6">
            Aucune plante en quantité suffisante.
          </p>
        ) : (
          <div className="space-y-2 mb-6">
            {eligible.map((item) => (
              <button
                key={item.plant_id}
                onClick={() => setSelectedPlantId(item.plant_id)}
                className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                  selectedPlantId === item.plant_id
                    ? 'border-accent2 bg-accent2/10 dark:bg-accent2/10'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.plant_icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.plant_name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${RARITY_BADGE[item.plant_rarity] ?? ''}`}>
                      {item.plant_rarity}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {item.quantity}×
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-outline text-sm py-1.5 px-4">
            Annuler
          </button>
          <button
            onClick={() => {
              if (selectedPlantId) onUnlock(plotId, selectedPlantId)
            }}
            disabled={!selectedPlantId || unlocking}
            className="btn btn-primary text-sm py-1.5 px-4"
          >
            {unlocking ? 'Déblocage…' : 'Débloquer'}
          </button>
        </div>
      </div>
    </div>
  )
}
