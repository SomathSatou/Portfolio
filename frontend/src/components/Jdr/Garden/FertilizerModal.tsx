import { useState } from 'react'

interface Props {
  plotId: number
  onConfirm: (fertilizer: string) => void
  onClose: () => void
  fertilizing: boolean
}

const FERTILIZERS = [
  { key: 'compost', label: 'Compost', bonus: '+0,5 %' },
  { key: 'azote', label: 'Engrais azoté', bonus: '+1 %' },
  { key: 'cendre_magique', label: 'Cendre magique', bonus: '+1,5 %' },
  { key: 'rosée', label: 'Eau de rosée', bonus: '+2 %' },
  { key: 'sang_bête', label: 'Sang de bête', bonus: '+2,5 %' },
]

export default function FertilizerModal({ onConfirm, onClose, fertilizing }: Props) {
  const [selected, setSelected] = useState('compost')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          Choisir un fertilisant
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Le fertilisant augmente les chances de mutation à la récolte.
        </p>

        <div className="space-y-2">
          {FERTILIZERS.map((f) => (
            <label
              key={f.key}
              className={`
                flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                ${selected === f.key
                  ? 'border-accent2 bg-accent1/10 dark:bg-accent1/10'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="fertilizer"
                  value={f.key}
                  checked={selected === f.key}
                  onChange={() => setSelected(f.key)}
                  className="accent-accent2"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{f.label}</span>
              </div>
              <span className="text-xs font-medium text-accent2 dark:text-accent1">{f.bonus}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn btn-outline text-sm"
            disabled={fertilizing}
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(selected)}
            className="btn btn-primary text-sm"
            disabled={fertilizing}
          >
            {fertilizing ? 'Application…' : 'Appliquer'}
          </button>
        </div>
      </div>
    </div>
  )
}
