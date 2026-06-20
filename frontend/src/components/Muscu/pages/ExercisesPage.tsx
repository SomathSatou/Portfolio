import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import ExerciseDrawer from '../ExerciseDrawer'
import ExerciseForm from '../ExerciseForm'
import { METRIC_LABELS } from '../types'
import type { Exercise, ExerciseInput, Gym, MuscleGroup } from '../types'

export default function ExercisesPage() {
  const { user } = useAuth()
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [muscleGroups, setMuscleGroups] = React.useState<MuscleGroup[]>([])
  const [gyms, setGyms] = React.useState<Gym[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // Filters
  const [filterGroup, setFilterGroup] = React.useState<string>('')
  const [filterSearch, setFilterSearch] = React.useState('')

  // Create form
  const [showCreate, setShowCreate] = React.useState(false)
  const [creating, setCreating] = React.useState(false)

  // Edit drawer
  const [editingExercise, setEditingExercise] = React.useState<Exercise | null>(null)
  const [updating, setUpdating] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    try {
      const [exRes, mgRes, gymRes] = await Promise.all([
        api.get<Exercise[]>('/exercises/'),
        api.get<MuscleGroup[]>('/muscle-groups/'),
        api.get<Gym[]>('/gyms/'),
      ])
      setExercises(Array.isArray(exRes.data) ? exRes.data : [])
      setMuscleGroups(Array.isArray(mgRes.data) ? mgRes.data : [])
      setGyms(Array.isArray(gymRes.data) ? gymRes.data : [])
    } catch {
      setError('Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void fetchData() }, [fetchData])

  async function createExercise(data: ExerciseInput) {
    setCreating(true)
    setError('')
    try {
      const res = await api.post<Exercise>('/exercises/', data)
      setExercises((prev) => [...prev, res.data])
      setShowCreate(false)
    } catch {
      setError("Erreur lors de la création de l'exercice.")
    } finally {
      setCreating(false)
    }
  }

  async function updateExercise(data: ExerciseInput) {
    if (!editingExercise) return
    setUpdating(true)
    setError('')
    try {
      const res = await api.patch<Exercise>(`/exercises/${editingExercise.id}/`, data)
      setExercises((prev) => prev.map((ex) => (ex.id === res.data.id ? res.data : ex)))
      setEditingExercise(null)
    } catch {
      setError("Erreur lors de la mise à jour de l'exercice.")
    } finally {
      setUpdating(false)
    }
  }

  async function deleteExercise(id: number) {
    if (!confirm('Supprimer cet exercice ?')) return
    try {
      await api.delete(`/exercises/${id}/`)
      setExercises((prev) => prev.filter((e) => e.id !== id))
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  const canEdit = (ex: Exercise) => ex.created_by === user?.id || user?.is_staff

  const filtered = exercises.filter((ex) => {
    if (filterSearch && !ex.name.toLowerCase().includes(filterSearch.toLowerCase())) return false
    if (filterGroup && !ex.muscle_targets.some((mt) => mt.muscle_group === filterGroup)) return false
    return true
  })

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Chargement…</p>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Exercices</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn btn-primary text-sm"
        >
          {showCreate ? 'Annuler' : '+ Nouvel exercice'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <div className="card space-y-4 border border-primary/20 dark:border-primaryLight/20">
          <h2 className="font-semibold text-primary dark:text-primaryLight">Créer un exercice</h2>
          <ExerciseForm
            gyms={gyms}
            muscleGroups={muscleGroups}
            submitLabel="Créer"
            loading={creating}
            onSubmit={createExercise}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher…"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">Tous les groupes</option>
          {muscleGroups.map((g) => (
            <option key={g.id} value={g.name}>{g.icon} {g.name}</option>
          ))}
        </select>
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            Aucun exercice trouvé.
          </p>
        )}
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="card cursor-pointer"
            onClick={() => { if (canEdit(ex)) setEditingExercise(ex) }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (canEdit(ex)) setEditingExercise(ex)
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">{ex.name}</h3>
                  {ex.is_public && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Public</span>
                  )}
                  {!ex.is_public && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Privé</span>
                  )}
                  {canEdit(ex) && (
                    <span className="text-xs text-primaryLight">Cliquer pour modifier</span>
                  )}
                </div>
                {ex.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ex.description}</p>
                )}
                {ex.machine_name && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Machine : {ex.machine_name}</p>
                )}
                {ex.muscle_targets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ex.muscle_targets.map((mt) => (
                      <span
                        key={mt.id}
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primaryLight/10 dark:text-primaryLight"
                      >
                        {mt.muscle_name}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Par {ex.created_by_name} · Difficulté ×{ex.difficulty_factor} · {METRIC_LABELS[ex.metric_type]}
                </p>
              </div>
              {(ex.created_by === user?.id || user?.is_staff) && !ex.is_public && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteExercise(ex.id)
                  }}
                  className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                  title="Supprimer"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ExerciseDrawer
        exercise={editingExercise}
        gyms={gyms}
        muscleGroups={muscleGroups}
        loading={updating}
        onClose={() => setEditingExercise(null)}
        onSubmit={updateExercise}
      />
    </div>
  )
}
