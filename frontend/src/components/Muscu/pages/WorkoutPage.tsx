import React from 'react'
import api from '../api'
import ExerciseForm from '../ExerciseForm'
import { METRIC_LABELS } from '../types'
import type { Exercise, ExerciseInput, Gym, MuscleGroup, Workout } from '../types'

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
  const [quantity, setQuantity] = React.useState('')
  const [addingSet, setAddingSet] = React.useState(false)

  const selectedExercise = React.useMemo(
    () => exercises.find((ex) => ex.id === selExercise),
    [exercises, selExercise],
  )

  // Start form
  const [selGym, setSelGym] = React.useState<number>(0)

  // Create exercise form
  const [showNewExercise, setShowNewExercise] = React.useState(false)
  const [muscleGroups, setMuscleGroups] = React.useState<MuscleGroup[]>([])
  const [creatingExercise, setCreatingExercise] = React.useState(false)

  // Close result
  const [closeResult, setCloseResult] = React.useState<{ xp_gained: Record<string, number>; new_badges: number[] } | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      const [workoutsRes, gymsRes, exercisesRes, muscleGroupsRes] = await Promise.all([
        api.get<Workout[]>('/workouts/'),
        api.get<Gym[]>('/gyms/'),
        api.get<Exercise[]>('/exercises/'),
        api.get<MuscleGroup[]>('/muscle-groups/'),
      ])
      const list = Array.isArray(workoutsRes.data) ? workoutsRes.data : []
      const open = list.find((w) => w.status === 'open')
      setWorkout(open ? { ...open, sets: open.sets ?? [] } : null)
      setGyms(Array.isArray(gymsRes.data) ? gymsRes.data : [])
      setExercises(Array.isArray(exercisesRes.data) ? exercisesRes.data : [])
      setMuscleGroups(Array.isArray(muscleGroupsRes.data) ? muscleGroupsRes.data : [])
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

  function canAddSet() {
    if (!workout || !selExercise) return false
    const metric = selectedExercise?.metric_type ?? 'weight_reps'
    if (metric === 'weight_reps') {
      return !!weight && !!reps
    }
    return !!quantity
  }

  async function addSet() {
    if (!workout || !selExercise || !canAddSet()) return
    setAddingSet(true)
    const metric = selectedExercise?.metric_type ?? 'weight_reps'
    const payload: Record<string, number> = {
      exercise: selExercise,
      order: (workout.sets ?? []).length,
    }
    if (metric === 'weight_reps') {
      payload.weight_kg = parseFloat(weight)
      payload.reps = parseInt(reps, 10)
    } else {
      payload.quantity_value = parseFloat(quantity)
    }
    try {
      await api.post(`/workouts/${workout.id}/sets/`, payload)
      // Refresh workout
      const res = await api.get<Workout>(`/workouts/${workout.id}/`)
      setWorkout(res.data)
      setWeight('')
      setReps('')
      setQuantity('')
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

  async function createExercise(data: ExerciseInput) {
    setCreatingExercise(true)
    setError('')
    try {
      const res = await api.post<Exercise>('/exercises/', data)
      const created = res.data
      setExercises((prev) => [...prev, created])
      setSelExercise(created.id)
      setShowNewExercise(false)
    } catch {
      setError("Erreur lors de la création de l'exercice.")
    } finally {
      setCreatingExercise(false)
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

        {/* Exercise selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Exercice</label>
          <select
            value={showNewExercise ? -1 : selExercise}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (v === -1) {
                setShowNewExercise(true)
              } else {
                setShowNewExercise(false)
                setSelExercise(v)
              }
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
            <option value={-1}>➕ Créer un exercice…</option>
          </select>
          {selectedExercise && !showNewExercise && (
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primaryLight/15 dark:text-primaryLight">
              {METRIC_LABELS[selectedExercise.metric_type]}
            </span>
          )}
        </div>

        {/* Metric-specific inputs */}
        {selectedExercise && !showNewExercise && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {selectedExercise.metric_type === 'weight_reps' ? (
              <>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Poids (kg)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="ex. 40"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    min={0}
                    step={0.5}
                  />
                </div>
                <span className="pb-2 text-gray-400">×</span>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Répétitions</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="ex. 12"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    min={1}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {selectedExercise.metric_type === 'distance'
                    ? 'Distance'
                    : selectedExercise.metric_type === 'duration'
                      ? 'Durée'
                      : 'Répétitions'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={
                      selectedExercise.metric_type === 'distance'
                        ? 'ex. 2000'
                        : selectedExercise.metric_type === 'duration'
                          ? 'ex. 20'
                          : 'ex. 30'
                    }
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 pr-14 text-sm text-gray-900 dark:text-gray-100"
                    min={0}
                    step={selectedExercise.metric_type === 'duration' ? 0.5 : 1}
                  />
                  {selectedExercise.metric_type !== 'reps_only' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {selectedExercise.metric_type === 'distance' ? 'm' : 'min'}
                    </span>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={addSet}
              disabled={addingSet || !canAddSet()}
              className="btn btn-primary text-sm px-4 py-2 flex-shrink-0"
            >
              {addingSet ? '…' : 'Ajouter'}
            </button>
          </div>
        )}

        {/* Inline create exercise form */}
        {showNewExercise && (
          <div className="mt-4 p-4 rounded-md border border-primary/30 dark:border-primaryLight/30 bg-primary/5 dark:bg-primaryLight/5 space-y-3">
            <h3 className="text-sm font-semibold text-primary dark:text-primaryLight">Nouvel exercice</h3>
            <ExerciseForm
              gyms={gyms}
              muscleGroups={muscleGroups}
              submitLabel="Créer"
              loading={creatingExercise}
              onSubmit={createExercise}
              onCancel={() => {
                setShowNewExercise(false)
                if (exercises.length > 0) setSelExercise(exercises[0].id)
              }}
            />
          </div>
        )}
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
                    {s.metric_type === 'weight_reps' && `${s.weight_kg}kg × ${s.reps}`}
                    {s.metric_type === 'distance' && `${s.quantity_value} m`}
                    {s.metric_type === 'duration' && `${s.quantity_value} min`}
                    {s.metric_type === 'reps_only' && `${s.quantity_value} reps`}
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
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
            {(() => {
              const sets = workout.sets ?? []
              const totals = {
                volume: sets.filter((s) => s.metric_type === 'weight_reps').reduce((a, s) => a + s.weight_kg * s.reps, 0),
                distance: sets.filter((s) => s.metric_type === 'distance').reduce((a, s) => a + s.quantity_value, 0),
                duration: sets.filter((s) => s.metric_type === 'duration').reduce((a, s) => a + s.quantity_value, 0),
                reps: sets.filter((s) => s.metric_type === 'reps_only').reduce((a, s) => a + s.quantity_value, 0),
              }
              return (
                <>
                  {totals.volume > 0 && <span>Volume : <strong>{totals.volume.toFixed(0)} kg</strong></span>}
                  {totals.distance > 0 && <span>Distance : <strong>{totals.distance.toFixed(0)} m</strong></span>}
                  {totals.duration > 0 && <span>Durée : <strong>{totals.duration.toFixed(0)} min</strong></span>}
                  {totals.reps > 0 && <span>Répétitions : <strong>{totals.reps.toFixed(0)}</strong></span>}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
