import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'

const RANK_COLORS: Record<string, string> = {
  bronze: '#cd7f32', argent: '#c0c0c0', or: '#ffd700', platine: '#e5e4e2',
  diamant: '#b9f2ff', master: '#9b59b6', legende: '#ff4500',
}

interface DashboardStats {
  rank: { tier: string; level: number; xp: number; position: number }
  favorite_gym: string | null
  top_muscle: { name: string; level: number; xp: number } | null
}

interface RecentWorkout {
  id: number
  gym_name: string | null
  started_at: string
  status: string
  sets: { id: number; exercise_name: string; weight_kg: number; reps: number }[]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [recent, setRecent] = React.useState<RecentWorkout[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/dashboard/stats/'),
      api.get<RecentWorkout[]>('/workouts/'),
    ]).then(([statsRes, workoutsRes]) => {
      setStats(statsRes.data)
      const workouts = Array.isArray(workoutsRes.data) ? workoutsRes.data : []
      setRecent(workouts.filter((w) => w.status === 'closed').slice(0, 5))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Chargement…</p>

  const rankColor = stats ? (RANK_COLORS[stats.rank.tier] || '#cd7f32') : '#cd7f32'
  const rankLabel = stats ? stats.rank.tier.charAt(0).toUpperCase() + stats.rank.tier.slice(1) : 'Bronze'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">
        Bienvenue, {user?.username}
      </h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Rank */}
        <div className="card flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: rankColor + '22', color: rankColor }}>
            {stats?.rank.position ? `#${stats.rank.position}` : '—'}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rang global</p>
            <p className="font-semibold" style={{ color: rankColor }}>{rankLabel}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Niv. {stats?.rank.level ?? 1} — {stats?.rank.xp ?? 0} XP</p>
          </div>
        </div>

        {/* Favorite gym */}
        <div className="card flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent2/20 flex items-center justify-center text-xl">
            🏋️
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Salle favorite</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
              {stats?.favorite_gym || 'Aucune'}
            </p>
          </div>
        </div>

        {/* Top muscle */}
        <div className="card flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent1/20 flex items-center justify-center text-xl">
            💪
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Muscle top</p>
            {stats?.top_muscle ? (
              <>
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{stats.top_muscle.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Niv. {stats.top_muscle.level}</p>
              </>
            ) : (
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <a href="#/irlrpg/workout" className="btn btn-primary">Nouvelle séance</a>
        <a href="#/irlrpg/goals" className="btn btn-outline">Mes objectifs</a>
        <a href="#/irlrpg/leaderboard" className="btn btn-outline">Classement</a>
        <a href="#/irlrpg/profile" className="btn btn-outline">Mon profil</a>
      </div>

      {/* Recent workouts */}
      {recent.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Dernières séances</h2>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recent.map((w) => {
              const sets = w.sets ?? []
              const volume = sets.reduce((acc, s) => acc + s.weight_kg * s.reps, 0)
              return (
                <div key={w.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {new Date(w.started_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {w.gym_name || 'Pas de salle'} — {(w.sets ?? []).length} série{(w.sets ?? []).length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{volume.toFixed(0)} kg</span>
                </div>
              )
            })}
          </div>
          <a href="#/irlrpg/history" className="mt-3 inline-block text-sm text-primary dark:text-primaryLight hover:underline">
            Voir tout l'historique →
          </a>
        </div>
      )}

      {recent.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Pas encore de séances. Commencez votre première !</p>
          <a href="#/irlrpg/workout" className="btn btn-accent mt-4">Démarrer une séance</a>
        </div>
      )}
    </div>
  )
}
