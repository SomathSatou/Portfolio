import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import { Spinner } from '../../ui'

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

  if (loading) {
    return (
      <div className="flex items-center gap-3 animate-fadeIn" style={{ color: 'var(--color-irlrpg-primary)' }}>
        <Spinner size="sm" />
        <span className="neon-label">CHARGEMENT…</span>
      </div>
    )
  }

  const rankColor = stats ? (RANK_COLORS[stats.rank.tier] || '#cd7f32') : '#cd7f32'
  const rankLabel = stats ? stats.rank.tier.charAt(0).toUpperCase() + stats.rank.tier.slice(1) : 'Bronze'

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="animate-fadeIn">
        <h1 className="title-neon text-2xl">BIENVENUE, {user?.username?.toUpperCase()}</h1>
        <p className="mt-1 neon-label">TABLEAU DE BORD</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        {/* Rank */}
        <div className="stat-neon flex items-center gap-3 animate-slideUp">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: rankColor + '22', color: rankColor, fontFamily: 'Orbitron, sans-serif', boxShadow: `0 0 12px ${rankColor}55` }}>
            {stats?.rank.position ? `#${stats.rank.position}` : '—'}
          </div>
          <div>
            <p className="neon-label">RANG GLOBAL</p>
            <p className="font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: rankColor, textShadow: `0 0 8px ${rankColor}88` }}>{rankLabel.toUpperCase()}</p>
            <p className="neon-label mt-1">NIV.{stats?.rank.level ?? 1} — {stats?.rank.xp ?? 0} XP</p>
          </div>
        </div>

        {/* Favorite gym */}
        <div className="stat-neon flex items-center gap-3 animate-slideUp">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)' }}>
            🏋️
          </div>
          <div>
            <p className="neon-label">SALLE FAVORITE</p>
            <p className="font-semibold neon-text mt-0.5">
              {stats?.favorite_gym || 'AUCUNE'}
            </p>
          </div>
        </div>

        {/* Top muscle */}
        <div className="stat-neon flex items-center gap-3 animate-slideUp">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.3)' }}>
            💪
          </div>
          <div>
            <p className="neon-label">MUSCLE TOP</p>
            {stats?.top_muscle ? (
              <>
                <p className="font-bold neon-accent-text mt-0.5">{stats.top_muscle.name.toUpperCase()}</p>
                <p className="neon-label">NIV.{stats.top_muscle.level}</p>
              </>
            ) : (
              <p className="font-bold neon-label mt-0.5">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 stagger-children">
        <a href="#/irlrpg/workout" className="btn-neon-lime animate-scaleIn">NOUVELLE SÉANCE</a>
        <a href="#/irlrpg/goals" className="btn-neon animate-scaleIn">OBJECTIFS</a>
        <a href="#/irlrpg/leaderboard" className="btn-neon animate-scaleIn">CLASSEMENT</a>
        <a href="#/irlrpg/profile" className="btn-neon animate-scaleIn">PROFIL</a>
      </div>

      {/* Recent workouts */}
      {recent.length > 0 && (
        <div className="card-neon animate-slideUp">
          <h2 className="font-bold mb-3 neon-primary-text" style={{ fontSize: '0.8rem' }}>DERNIÈRES SÉANCES</h2>
          <div className="neon-divider">
            {recent.map((w) => {
              const sets = w.sets ?? []
              const volume = sets.reduce((acc, s) => acc + s.weight_kg * s.reps, 0)
              return (
                <div key={w.id} className="flex items-center justify-between py-2 neon-row">
                  <div>
                    <p className="font-medium neon-text" style={{ fontSize: '0.7rem' }}>
                      {new Date(w.started_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                    </p>
                    <p className="neon-label">
                      {w.gym_name || 'SANS SALLE'} — {(w.sets ?? []).length} SÉRIE{(w.sets ?? []).length > 1 ? 'S' : ''}
                    </p>
                  </div>
                  <span className="neon-accent-text" style={{ fontSize: '0.7rem' }}>{volume.toFixed(0)} KG</span>
                </div>
              )
            })}
          </div>
          <a href="#/irlrpg/history" className="mt-3 inline-block text-xs neon-link">
            VOIR TOUT L'HISTORIQUE →
          </a>
        </div>
      )}

      {recent.length === 0 && (
        <div className="card-neon text-center py-8 animate-slideUp">
          <p className="mb-4 neon-label" style={{ fontSize: '0.75rem' }}>AUCUNE SÉANCE. INITIALISEZ VOTRE PREMIÈRE MISSION.</p>
          <a href="#/irlrpg/workout" className="btn-neon-lime">▶ DÉMARRER</a>
        </div>
      )}
    </div>
  )
}
