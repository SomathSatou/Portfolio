import React from 'react'
import api from '../api'

type Tab = 'users' | 'exercises' | 'gyms' | 'badges' | 'workouts' | 'stats'

interface AdminUser {
  id: number
  username: string
  email: string
  can_access_muscu: boolean
  is_banned: boolean
  is_staff: boolean
}

interface AdminExercise {
  id: number
  name: string
  is_public: boolean
  difficulty_factor: number
  created_by: number | null
}

interface AdminGym {
  id: number
  name: string
  city: string
  address: string
}

interface AdminBadge {
  id: number
  name: string
  description: string
  icon: string
  trigger_type: string
  trigger_value: number
}

interface AdminWorkout {
  id: number
  user_name: string
  gym_name: string | null
  status: string
  started_at: string
  sets_count: number
}

interface AdminStats {
  total_users: number
  total_workouts: number
  total_sets: number
  total_exercises: number
}

export default function AdminPage() {
  const [tab, setTab] = React.useState<Tab>('stats')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stats', label: 'Stats' },
    { key: 'users', label: 'Utilisateurs' },
    { key: 'exercises', label: 'Exercices' },
    { key: 'gyms', label: 'Salles' },
    { key: 'badges', label: 'Badges' },
    { key: 'workouts', label: 'Séances' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Administration</h1>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary dark:text-primaryLight dark:border-primaryLight'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'exercises' && <ExercisesTab />}
      {tab === 'gyms' && <GymsTab />}
      {tab === 'badges' && <BadgesTab />}
      {tab === 'workouts' && <WorkoutsTab />}
    </div>
  )
}

function StatsTab() {
  const [stats, setStats] = React.useState<AdminStats | null>(null)
  React.useEffect(() => {
    api.get<AdminStats>('/admin/stats/').then((r) => setStats(r.data)).catch(() => {})
  }, [])
  if (!stats) return <p className="text-gray-500">Chargement…</p>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { label: 'Utilisateurs', value: stats.total_users },
        { label: 'Séances', value: stats.total_workouts },
        { label: 'Séries', value: stats.total_sets },
        { label: 'Exercices', value: stats.total_exercises },
      ].map((s) => (
        <div key={s.label} className="card text-center">
          <p className="text-2xl font-bold text-primary dark:text-primaryLight">{s.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchUsers = React.useCallback(() => {
    setLoading(true)
    api.get<AdminUser[]>('/admin/users/').then((r) => setUsers(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { fetchUsers() }, [fetchUsers])

  async function toggleAccess(u: AdminUser) {
    await api.patch(`/admin/users/${u.id}/`, { can_access_muscu: !u.can_access_muscu })
    fetchUsers()
  }

  async function toggleBan(u: AdminUser) {
    await api.patch(`/admin/users/${u.id}/`, { is_banned: !u.is_banned })
    fetchUsers()
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="py-2 px-2">Utilisateur</th>
            <th className="py-2 px-2">Email</th>
            <th className="py-2 px-2 text-center">Accès</th>
            <th className="py-2 px-2 text-center">Banni</th>
            <th className="py-2 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 px-2 font-medium text-gray-800 dark:text-gray-200">{u.username}</td>
              <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{u.email}</td>
              <td className="py-2 px-2 text-center">
                <button onClick={() => toggleAccess(u)} className={`text-xs px-2 py-0.5 rounded ${u.can_access_muscu ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {u.can_access_muscu ? 'Oui' : 'Non'}
                </button>
              </td>
              <td className="py-2 px-2 text-center">
                <button onClick={() => toggleBan(u)} className={`text-xs px-2 py-0.5 rounded ${u.is_banned ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {u.is_banned ? 'Oui' : 'Non'}
                </button>
              </td>
              <td className="py-2 px-2">
                <button onClick={() => api.post(`/admin/users/${u.id}/reset/`).then(() => fetchUsers())} className="text-xs text-red-500 hover:text-red-700">
                  Reset XP
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExercisesTab() {
  const [exercises, setExercises] = React.useState<AdminExercise[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetch = React.useCallback(() => {
    setLoading(true)
    api.get<AdminExercise[]>('/admin/exercises/').then((r) => setExercises(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { fetch() }, [fetch])

  async function togglePublish(ex: AdminExercise) {
    await api.post(`/admin/exercises/${ex.id}/publish/`)
    fetch()
  }

  async function deleteExercise(id: number) {
    if (!confirm('Supprimer cet exercice ?')) return
    await api.delete(`/admin/exercises/${id}/`)
    fetch()
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="py-2 px-2">Nom</th>
            <th className="py-2 px-2 text-center">Public</th>
            <th className="py-2 px-2 text-right">Difficulté</th>
            <th className="py-2 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((ex) => (
            <tr key={ex.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 px-2 font-medium text-gray-800 dark:text-gray-200">{ex.name}</td>
              <td className="py-2 px-2 text-center">
                <button onClick={() => togglePublish(ex)} className={`text-xs px-2 py-0.5 rounded ${ex.is_public ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                  {ex.is_public ? 'Public' : 'Privé'}
                </button>
              </td>
              <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">×{ex.difficulty_factor}</td>
              <td className="py-2 px-2">
                <button onClick={() => deleteExercise(ex.id)} className="text-xs text-red-500 hover:text-red-700">Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GymsTab() {
  const [gyms, setGyms] = React.useState<AdminGym[]>([])
  const [loading, setLoading] = React.useState(true)
  const [name, setName] = React.useState('')
  const [city, setCity] = React.useState('')
  const [address, setAddress] = React.useState('')

  const fetch = React.useCallback(() => {
    setLoading(true)
    api.get<AdminGym[]>('/admin/gyms/').then((r) => setGyms(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { fetch() }, [fetch])

  async function addGym() {
    if (!name) return
    await api.post('/admin/gyms/', { name, city, address })
    setName(''); setCity(''); setAddress('')
    fetch()
  }

  async function deleteGym(id: number) {
    if (!confirm('Supprimer cette salle ?')) return
    await api.delete(`/admin/gyms/${id}/`)
    fetch()
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 flex-1" />
        <button onClick={addGym} disabled={!name} className="btn btn-primary text-sm">Ajouter</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 px-2">Nom</th>
              <th className="py-2 px-2">Ville</th>
              <th className="py-2 px-2">Adresse</th>
              <th className="py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {gyms.map((g) => (
              <tr key={g.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-2 font-medium text-gray-800 dark:text-gray-200">{g.name}</td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{g.city}</td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{g.address}</td>
                <td className="py-2 px-2">
                  <button onClick={() => deleteGym(g.id)} className="text-xs text-red-500 hover:text-red-700">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BadgesTab() {
  const [badges, setBadges] = React.useState<AdminBadge[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetch = React.useCallback(() => {
    setLoading(true)
    api.get<AdminBadge[]>('/admin/badges/').then((r) => setBadges(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { fetch() }, [fetch])

  return (
    <div className="overflow-x-auto">
      {loading ? <p className="text-gray-500">Chargement…</p> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 px-2">Icon</th>
              <th className="py-2 px-2">Nom</th>
              <th className="py-2 px-2">Description</th>
              <th className="py-2 px-2">Trigger</th>
              <th className="py-2 px-2 text-right">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {badges.map((b) => (
              <tr key={b.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-2 text-xl">{b.icon}</td>
                <td className="py-2 px-2 font-medium text-gray-800 dark:text-gray-200">{b.name}</td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{b.description}</td>
                <td className="py-2 px-2 text-gray-500 dark:text-gray-400">{b.trigger_type}</td>
                <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">{b.trigger_value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function WorkoutsTab() {
  const [workouts, setWorkouts] = React.useState<AdminWorkout[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetch = React.useCallback(() => {
    setLoading(true)
    api.get<AdminWorkout[]>('/admin/workouts/').then((r) => setWorkouts(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { fetch() }, [fetch])

  async function forceClose(id: number) {
    await api.post(`/admin/workouts/${id}/force-close/`)
    fetch()
  }

  async function deleteWorkout(id: number) {
    if (!confirm('Supprimer cette séance ?')) return
    await api.delete(`/admin/workouts/${id}/`)
    fetch()
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="py-2 px-2">ID</th>
            <th className="py-2 px-2">Joueur</th>
            <th className="py-2 px-2">Salle</th>
            <th className="py-2 px-2">Statut</th>
            <th className="py-2 px-2">Date</th>
            <th className="py-2 px-2 text-right">Séries</th>
            <th className="py-2 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workouts.map((w) => (
            <tr key={w.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 px-2 text-gray-400">{w.id}</td>
              <td className="py-2 px-2 font-medium text-gray-800 dark:text-gray-200">{w.user_name}</td>
              <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{w.gym_name || '—'}</td>
              <td className="py-2 px-2">
                <span className={`text-xs px-2 py-0.5 rounded ${w.status === 'open' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}>
                  {w.status}
                </span>
              </td>
              <td className="py-2 px-2 text-gray-500 dark:text-gray-400 text-xs">
                {new Date(w.started_at).toLocaleDateString('fr-FR')}
              </td>
              <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">{w.sets_count}</td>
              <td className="py-2 px-2 flex gap-2">
                {w.status === 'open' && (
                  <button onClick={() => forceClose(w.id)} className="text-xs text-yellow-600 hover:text-yellow-800">Forcer clôture</button>
                )}
                <button onClick={() => deleteWorkout(w.id)} className="text-xs text-red-500 hover:text-red-700">Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
