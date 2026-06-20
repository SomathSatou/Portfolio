import type { Exercise, ExerciseInput, Gym, MuscleGroup } from './types'
import ExerciseForm from './ExerciseForm'

interface ExerciseDrawerProps {
  exercise: Exercise | null
  gyms: Gym[]
  muscleGroups: MuscleGroup[]
  loading: boolean
  onClose: () => void
  onSubmit: (data: ExerciseInput) => void
}

export default function ExerciseDrawer({
  exercise,
  gyms,
  muscleGroups,
  loading,
  onClose,
  onSubmit,
}: ExerciseDrawerProps) {
  if (!exercise) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-gray-900 border-l border-gray-700 shadow-xl flex flex-col animate-slideInRight"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-primaryLight">Modifier l'exercice</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ExerciseForm
            initial={{
              name: exercise.name,
              description: exercise.description,
              machine: exercise.machine,
              difficulty_factor: exercise.difficulty_factor,
              metric_type: exercise.metric_type,
              muscle_ids: exercise.muscle_targets.map((mt) => mt.muscle),
            }}
            gyms={gyms}
            muscleGroups={muscleGroups}
            submitLabel="Enregistrer"
            loading={loading}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </>
  )
}
