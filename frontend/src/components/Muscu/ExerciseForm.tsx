import React from 'react'
import type { ExerciseInput, Gym, Machine, MetricType, MuscleGroup } from './types'
import { METRIC_LABELS } from './types'

interface ExerciseFormProps {
  initial?: Partial<ExerciseInput>
  gyms: Gym[]
  muscleGroups: MuscleGroup[]
  submitLabel: string
  loading: boolean
  onSubmit: (data: ExerciseInput) => void
  onCancel: () => void
}

export default function ExerciseForm({
  initial,
  gyms,
  muscleGroups,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}: ExerciseFormProps) {
  const [name, setName] = React.useState(initial?.name ?? '')
  const [description, setDescription] = React.useState(initial?.description ?? '')
  const [metricType, setMetricType] = React.useState<MetricType>(initial?.metric_type ?? 'weight_reps')
  const [difficultyFactor, setDifficultyFactor] = React.useState<number>(initial?.difficulty_factor ?? 1.0)
  const [gymId, setGymId] = React.useState<number>(0)
  const [machineId, setMachineId] = React.useState<number>(initial?.machine ?? 0)
  const [muscleIds, setMuscleIds] = React.useState<number[]>(initial?.muscle_ids ?? [])
  const [machines, setMachines] = React.useState<Machine[]>([])

  React.useEffect(() => {
    if (gymId) {
      fetch(`/api/muscu/gyms/${gymId}/machines/`)
        .then((r) => r.json())
        .then((data) => setMachines(Array.isArray(data) ? data : []))
        .catch(() => setMachines([]))
    } else {
      setMachines([])
      setMachineId(0)
    }
  }, [gymId])

  const toggleMuscle = (id: number) => {
    setMuscleIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      machine: machineId || null,
      difficulty_factor: difficultyFactor,
      metric_type: metricType,
      muscle_ids: muscleIds,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Nom</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de l'exercice *"
          required
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optionnel)"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Type de quantification</label>
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as MetricType)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            {Object.entries(METRIC_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Difficulté ×</label>
          <input
            type="number"
            value={difficultyFactor}
            onChange={(e) => setDifficultyFactor(parseFloat(e.target.value) || 1)}
            min={0.1}
            step={0.1}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Salle (optionnel)</label>
          <select
            value={gymId}
            onChange={(e) => { setGymId(Number(e.target.value)); setMachineId(0) }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value={0}>— Aucune salle —</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Machine (optionnel)</label>
          <select
            value={machineId}
            onChange={(e) => setMachineId(Number(e.target.value))}
            disabled={!gymId}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
          >
            <option value={0}>— Aucune machine —</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Muscles ciblés</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 max-h-60 overflow-y-auto">
          {muscleGroups.map((g) => (
            <div key={g.id}>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2">{g.icon} {g.name}</p>
              {g.muscles.map((m) => (
                <label key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={muscleIds.includes(m.id)}
                    onChange={() => toggleMuscle(m.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  {m.name}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="btn btn-primary text-sm"
        >
          {loading ? 'Enregistrement…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-outline text-sm"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
