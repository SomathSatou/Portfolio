import React from 'react'
import api from '../api'

interface WorkoutSet {
  id: number
  exercise_name: string
  weight_kg: number
  reps: number
}

interface Workout {
  id: number
  gym_name: string | null
  started_at: string
  finished_at: string | null
  status: string
  sets: WorkoutSet[]
}

export default function HistoryPage() {
  const [workouts, setWorkouts] = React.useState<Workout[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandedId, setExpandedId] = React.useState<number | null>(null)

  React.useEffect(() => {
    api.get<Workout[]>('/workouts/')
      .then((res) => setWorkouts(res.data.filter((w) => w.status === 'closed')))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Chargement…</p>

  if (workouts.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Historique</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Aucune séance terminée pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-primary dark:text-primaryLight mb-6">Historique</h1>
      <div className="space-y-3">
        {workouts.map((w) => {
          const volume = w.sets.reduce((acc, s) => acc + s.weight_kg * s.reps, 0)
          const isExpanded = expandedId === w.id
          return (
            <div key={w.id} className="card">
              <button
                onClick={() => setExpandedId(isExpanded ? null : w.id)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {new Date(w.started_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {w.gym_name || 'Pas de salle'} — {w.sets.length} série{w.sets.length > 1 ? 's' : ''} — {volume.toFixed(0)} kg
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                  {w.sets.map((s, i) => (
                    <div key={s.id} className="flex justify-between py-1 text-sm">
                      <span>
                        <span className="text-gray-400">#{i + 1}</span>{' '}
                        <span className="text-gray-700 dark:text-gray-300">{s.exercise_name}</span>
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {s.weight_kg}kg × {s.reps}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
