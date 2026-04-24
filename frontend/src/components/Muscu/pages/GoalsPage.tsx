import React from 'react'
import api from '../api'

interface Exercise {
  id: number
  name: string
}

interface Goal {
  id: number
  exercise: number
  exercise_name: string
  metric: string
  target_value: number
  current_value: number
  status: string
  created_at: string
  achieved_at: string | null
}

const METRIC_LABELS: Record<string, string> = {
  max_weight: 'Poids max (kg)',
  max_reps: 'Reps max',
  total_volume: 'Volume total (kg)',
}

export default function GoalsPage() {
  const [goals, setGoals] = React.useState<Goal[]>([])
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [error, setError] = React.useState('')

  // Form state
  const [formExercise, setFormExercise] = React.useState(0)
  const [formMetric, setFormMetric] = React.useState('max_weight')
  const [formTarget, setFormTarget] = React.useState('')

  const fetchGoals = React.useCallback(async () => {
    try {
      const [goalsRes, exRes] = await Promise.all([
        api.get<Goal[]>('/goals/'),
        api.get<Exercise[]>('/exercises/'),
      ])
      setGoals(goalsRes.data)
      setExercises(exRes.data)
      if (exRes.data.length > 0) setFormExercise(exRes.data[0].id)
    } catch {
      setError('Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void fetchGoals() }, [fetchGoals])

  async function createGoal() {
    if (!formExercise || !formTarget) return
    setError('')
    try {
      await api.post('/goals/', {
        exercise: formExercise,
        metric: formMetric,
        target_value: parseFloat(formTarget),
      })
      setShowForm(false)
      setFormTarget('')
      await fetchGoals()
    } catch {
      setError('Erreur lors de la création.')
    }
  }

  async function abandonGoal(id: number) {
    try {
      await api.patch(`/goals/${id}/`, { status: 'abandoned' })
      await fetchGoals()
    } catch {
      setError('Erreur.')
    }
  }

  async function deleteGoal(id: number) {
    try {
      await api.delete(`/goals/${id}/`)
      await fetchGoals()
    } catch {
      setError('Erreur.')
    }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Chargement…</p>

  const active = goals.filter((g) => g.status === 'active')
  const achieved = goals.filter((g) => g.status === 'achieved')
  const abandoned = goals.filter((g) => g.status === 'abandoned')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Objectifs</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary text-sm">
          {showForm ? 'Annuler' : '+ Nouvel objectif'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Create form */}
      {showForm && (
        <div className="card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={formExercise}
              onChange={(e) => setFormExercise(Number(e.target.value))}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <select
              value={formMetric}
              onChange={(e) => setFormMetric(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              {Object.entries(METRIC_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Cible"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                min={0}
              />
              <button onClick={createGoal} disabled={!formTarget} className="btn btn-accent text-sm px-4">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active goals */}
      {active.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">En cours ({active.length})</h2>
          <div className="space-y-3">
            {active.map((g) => {
              const pct = Math.min(100, (g.current_value / g.target_value) * 100)
              return (
                <div key={g.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{g.exercise_name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{METRIC_LABELS[g.metric]}</span>
                    </div>
                    <button onClick={() => abandonGoal(g.id)} className="text-xs text-gray-400 hover:text-red-500">Abandonner</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent1 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 text-right">
                      {g.current_value} / {g.target_value}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Achieved */}
      {achieved.length > 0 && (
        <div>
          <h2 className="font-semibold text-accent1 mb-3">Atteints ({achieved.length})</h2>
          <div className="space-y-2">
            {achieved.map((g) => (
              <div key={g.id} className="card flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{g.exercise_name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{METRIC_LABELS[g.metric]} — {g.target_value}</span>
                </div>
                <span className="text-accent1 text-sm font-semibold">Atteint !</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abandoned */}
      {abandoned.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-400 mb-3">Abandonnés ({abandoned.length})</h2>
          <div className="space-y-2">
            {abandoned.map((g) => (
              <div key={g.id} className="card flex items-center justify-between opacity-60">
                <span className="text-sm text-gray-600 dark:text-gray-400">{g.exercise_name} — {METRIC_LABELS[g.metric]} — {g.target_value}</span>
                <button onClick={() => deleteGoal(g.id)} className="text-xs text-red-400 hover:text-red-600">Supprimer</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <p className="text-gray-500 dark:text-gray-400">Aucun objectif. Créez-en un !</p>
      )}
    </div>
  )
}
