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
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 shadow-xl flex flex-col animate-slideInRight"
        style={{ background: 'var(--color-irlrpg-bg)', borderLeft: '1px solid rgba(14, 165, 233, 0.35)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(14, 165, 233, 0.25)' }}>
          <h2 className="title-neon text-base">MODIFIER L'EXERCICE</h2>
          <button
            onClick={onClose}
            className="transition-colors opacity-60 hover:opacity-100"
            style={{ color: 'var(--color-irlrpg-primary)' }}
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
