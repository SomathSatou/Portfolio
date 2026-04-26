import React from 'react'
import api from '../api'

interface Gym {
  id: number
  name: string
  city: string
}

interface Exercise {
  id: number
  name: string
  muscle_targets: { muscle_name: string; involvement: number }[]
}

interface WorkoutSet {
  id: number
  exercise: number
  exercise_name: string
  weight_kg: number
  reps: number
  order: number
}

interface Workout {
  id: number
  gym: number | null
  gym_name: string | null
  started_at: string
  status: string
  sets: WorkoutSet[]
}

export default function WorkoutPage() {
  const [workout, setWorkout] = React.useState<Workout | null>(null)
  const [gyms, setGyms] = React.useState<Gym[]>([])
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // New set form
  const [selExercise, setSelExercise] = React.useState<number>(0)
  const [weight, setWeight] = React.useState('')
  const [reps, setReps] = React.useState('')
  const [addingSet, setAddingSet] = React.useState(false)

  // Start form
  const [selGym, setSelGym] = React.useState<number>(0)

  // Close result
  const [closeResult, setCloseResult] = React.useState<{ xp_gained: Record<string, number>; new_badges: number[] } | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      const [workoutsRes, gymsRes, exercisesRes] = await Promise.all([
        api.get<Workout[]>('/workouts/'),
        api.get<Gym[]>('/gyms/'),
        api.get<Exercise[]>('/exercises/'),
      ])
      const list = Array.isArray(workoutsRes.data) ? workoutsRes.data : []
      const open = list.find((w) => w.status === 'open')
      setWorkout(open ? { ...open, sets: open.sets ?? [] } : null)
      setGyms(gymsRes.data)
      setExercises(exercisesRes.data)
      if (exercisesRes.data.length > 0) setSelExercise(exercisesRes.data[0].id)
    } catch {
      setError('Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void fetchData() }, [fetchData])

  async function startWorkout() {
    setError('')
    try {
      const res = await api.post<Workout>('/workouts/', {
        gym: selGym || null,
      })
      setWorkout({ ...res.data, sets: res.data.sets ?? [] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Impossible de démarrer la séance.')
    }
  }

  async function addSet() {
    if (!workout || !selExercise || !weight || !reps) return
    setAddingSet(true)
    try {
      await api.post(`/workouts/${workout.id}/sets/`, {
        exercise: selExercise,
        weight_kg: parseFloat(weight),
        reps: parseInt(reps, 10),
        order: (workout.sets ?? []).length,
      })
      // Refresh workout
      const res = await api.get<Workout>(`/workouts/${workout.id}/`)
      setWorkout(res.data)
      setWeight('')
      setReps('')
    } catch {
      setError("Erreur lors de l'ajout de la série.")
    } finally {
      setAddingSet(false)
    }
  }

  async function deleteSet(setId: number) {
    if (!workout) return
    try {
      await api.delete(`/workouts/${workout.id}/sets/${setId}/`)
      const res = await api.get<Workout>(`/workouts/${workout.id}/`)
      setWorkout(res.data)
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  async function closeWorkout() {
    if (!workout) return
    try {
      const res = await api.post<{ xp_gained: Record<string, number>; new_badges: number[] }>(
        `/workouts/${workout.id}/close/`,
      )
      setCloseResult(res.data)
      setWorkout(null)
    } catch {
      setError('Erreur lors de la clôture.')
    }
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
  }

  // Close result screen
  if (closeResult) {
    const totalXP = Object.values(closeResult.xp_gained).reduce((a, b) => a + b, 0)
    return (
      <div className="max-w-lg mx-auto">
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-primary dark:text-primaryLight">Séance terminée !</h2>
          <p className="mt-4 text-4xl font-bold text-accent1">+{totalXP} XP</p>
          {(closeResult.new_badges ?? []).length > 0 && (
            <p className="mt-2 text-accent3 font-semibold">
              🏆 {(closeResult.new_badges ?? []).length} nouveau(x) badge(s) débloqué(s) !
            </p>
          )}
          <button
            onClick={() => setCloseResult(null)}
            className="btn btn-primary mt-6"
          >
            Continuer
          </button>
        </div>
      </div>
    )
  }

  // No active workout — start one
  if (!workout) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-primary dark:text-primaryLight mb-6">Nouvelle séance</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Salle (optionnel)
            </label>
            <select
              value={selGym}
              onChange={(e) => setSelGym(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              <option value={0}>— Aucune salle —</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <button onClick={startWorkout} className="btn btn-primary w-full justify-center">
            Démarrer la séance
          </button>
        </div>
      </div>
    )
  }

  // Active workout
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Séance en cours</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {workout.gym_name || 'Pas de salle'} — Démarrée à {new Date(workout.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={closeWorkout}
          className="btn btn-accent"
          disabled={(workout.sets ?? []).length === 0}
        >
          Terminer
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Add set form */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Ajouter une série</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <select
              value={selExercise}
              onChange={(e) => setSelExercise(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="number"
              placeholder="Poids (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              min={0}
              step={0.5}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Reps"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              min={1}
            />
            <button
              onClick={addSet}
              disabled={addingSet || !weight || !reps}
              className="btn btn-primary text-sm px-3 py-2 flex-shrink-0"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Sets list */}
      {(workout.sets ?? []).length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Séries ({(workout.sets ?? []).length})
          </h2>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {(workout.sets ?? []).map((s, i) => (
              <div key={s.id} className="flex items-center justify-between py-2">
                <div className="text-sm">
                  <span className="text-gray-400 mr-2">#{i + 1}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{s.exercise_name}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    {s.weight_kg}kg × {s.reps}
                  </span>
                </div>
                <button
                  onClick={() => deleteSet(s.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            Volume total : {(workout.sets ?? []).reduce((acc, s) => acc + s.weight_kg * s.reps, 0).toFixed(0)} kg
          </div>
        </div>
      )}
    </div>
  )
}
