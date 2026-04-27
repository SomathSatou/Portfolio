import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'

interface MuscleTarget {
  id: number
  muscle: number
  muscle_name: string
  muscle_group: string
  involvement: number
}

interface Exercise {
  id: number
  name: string
  description: string
  machine: number | null
  machine_name: string | null
  is_public: boolean
  created_by: number
  created_by_name: string
  difficulty_factor: number
  muscle_targets: MuscleTarget[]
  created_at: string
}

interface MuscleGroup {
  id: number
  name: string
  icon: string
  muscles: { id: number; name: string }[]
}

interface Gym {
  id: number
  name: string
  city: string
}

interface Machine {
  id: number
  name: string
  gym: number
  description: string
}

export default function ExercisesPage() {
  const { user } = useAuth()
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [muscleGroups, setMuscleGroups] = React.useState<MuscleGroup[]>([])
  const [gyms, setGyms] = React.useState<Gym[]>([])
  const [machines, setMachines] = React.useState<Machine[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // Filters
  const [filterGroup, setFilterGroup] = React.useState<string>('')
  const [filterSearch, setFilterSearch] = React.useState('')

  // Create form
  const [showCreate, setShowCreate] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newDesc, setNewDesc] = React.useState('')
  const [newMachineId, setNewMachineId] = React.useState<number>(0)
  const [newMuscleIds, setNewMuscleIds] = React.useState<number[]>([])
  const [newGymId, setNewGymId] = React.useState<number>(0)
  const [creating, setCreating] = React.useState(false)

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

  // Load machines when gym changes
  React.useEffect(() => {
    if (newGymId) {
      api.get<Machine[]>(`/gyms/${newGymId}/machines/`).then((r) => {
        setMachines(Array.isArray(r.data) ? r.data : [])
      }).catch(() => setMachines([]))
    } else {
      setMachines([])
      setNewMachineId(0)
    }
  }, [newGymId])

  async function createExercise() {
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await api.post<Exercise>('/exercises/', {
        name: newName.trim(),
        description: newDesc.trim(),
        machine: newMachineId || null,
        muscle_ids: newMuscleIds,
      })
      setExercises((prev) => [...prev, res.data])
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      setNewMachineId(0)
      setNewMuscleIds([])
      setNewGymId(0)
    } catch {
      setError("Erreur lors de la création de l'exercice.")
    } finally {
      setCreating(false)
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

  // Filtered exercises
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
          <input
            type="text"
            placeholder="Nom de l'exercice *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            placeholder="Description (optionnel)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />

          {/* Machine selection via gym */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Salle (optionnel)</label>
              <select
                value={newGymId}
                onChange={(e) => { setNewGymId(Number(e.target.value)); setNewMachineId(0) }}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value={0}>— Aucune salle —</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Machine (optionnel)</label>
              <select
                value={newMachineId}
                onChange={(e) => setNewMachineId(Number(e.target.value))}
                disabled={!newGymId}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
              >
                <option value={0}>— Aucune machine —</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Muscle targets */}
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Muscles ciblés :</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 max-h-60 overflow-y-auto">
              {muscleGroups.map((g) => (
                <div key={g.id}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2">{g.icon} {g.name}</p>
                  {g.muscles.map((m) => (
                    <label key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={newMuscleIds.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewMuscleIds((prev) => [...prev, m.id])
                          } else {
                            setNewMuscleIds((prev) => prev.filter((id) => id !== m.id))
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={createExercise}
              disabled={creating || !newName.trim()}
              className="btn btn-primary text-sm"
            >
              {creating ? 'Création…' : 'Créer'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="btn btn-outline text-sm"
            >
              Annuler
            </button>
          </div>
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
          <div key={ex.id} className="card">
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
                  Par {ex.created_by_name} · Difficulté ×{ex.difficulty_factor}
                </p>
              </div>
              {(ex.created_by === user?.id || user?.is_staff) && !ex.is_public && (
                <button
                  onClick={() => deleteExercise(ex.id)}
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
    </div>
  )
}
