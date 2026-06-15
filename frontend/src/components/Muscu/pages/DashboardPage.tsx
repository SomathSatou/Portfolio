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

  if (loading) return <p className="text-sm" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', letterSpacing: '0.06em', color: '#475569' }}>CHARGEMENT…</p>

  const rankColor = stats ? (RANK_COLORS[stats.rank.tier] || '#cd7f32') : '#cd7f32'
  const rankLabel = stats ? stats.rank.tier.charAt(0).toUpperCase() + stats.rank.tier.slice(1) : 'Bronze'

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="title-neon text-2xl">BIENVENUE, {user?.username?.toUpperCase()}</h1>
        <p className="mt-1 text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.1em', color: '#475569' }}>TABLEAU DE BORD</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Rank */}
        <div className="card-neon flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: rankColor + '22', color: rankColor, fontFamily: 'Orbitron, sans-serif', boxShadow: `0 0 12px ${rankColor}55` }}>
            {stats?.rank.position ? `#${stats.rank.position}` : '—'}
          </div>
          <div>
            <p className="text-xs" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em', color: '#475569' }}>RANG GLOBAL</p>
            <p className="font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: rankColor, textShadow: `0 0 8px ${rankColor}88` }}>{rankLabel.toUpperCase()}</p>
            <p className="text-xs mt-1" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', color: '#475569' }}>NIV.{stats?.rank.level ?? 1} — {stats?.rank.xp ?? 0} XP</p>
          </div>
        </div>

        {/* Favorite gym */}
        <div className="card-neon flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)' }}>
            🏋️
          </div>
          <div>
            <p className="text-xs" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em', color: '#475569' }}>SALLE FAVORITE</p>
            <p className="font-semibold text-sm mt-0.5" style={{ color: '#e2e8f0', fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem' }}>
              {stats?.favorite_gym || 'AUCUNE'}
            </p>
          </div>
        </div>

        {/* Top muscle */}
        <div className="card-neon-lime flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.3)' }}>
            💪
          </div>
          <div>
            <p className="text-xs" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em', color: '#475569' }}>MUSCLE TOP</p>
            {stats?.top_muscle ? (
              <>
                <p className="font-bold text-sm mt-0.5" style={{ color: '#84cc16', fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem' }}>{stats.top_muscle.name.toUpperCase()}</p>
                <p className="text-xs" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', color: '#475569' }}>NIV.{stats.top_muscle.level}</p>
              </>
            ) : (
              <p className="font-bold text-sm mt-0.5" style={{ color: '#475569', fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem' }}>—</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <a href="#/irlrpg/workout" className="btn-neon-lime">NOUVELLE SÉANCE</a>
        <a href="#/irlrpg/goals" className="btn-neon">OBJECTIFS</a>
        <a href="#/irlrpg/leaderboard" className="btn-neon">CLASSEMENT</a>
        <a href="#/irlrpg/profile" className="btn-neon">PROFIL</a>
      </div>

      {/* Recent workouts */}
      {recent.length > 0 && (
        <div className="card-neon">
          <h2 className="font-bold mb-3" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', letterSpacing: '0.08em', color: '#0ea5e9' }}>DERNIÈRES SÉANCES</h2>
          <div style={{ borderTop: '1px solid rgba(14,165,233,0.15)' }}>
            {recent.map((w) => {
              const sets = w.sets ?? []
              const volume = sets.reduce((acc, s) => acc + s.weight_kg * s.reps, 0)
              return (
                <div key={w.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(14,165,233,0.1)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#e2e8f0', fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                      {new Date(w.started_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                    </p>
                    <p className="text-xs" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', color: '#475569' }}>
                      {w.gym_name || 'SANS SALLE'} — {(w.sets ?? []).length} SÉRIE{(w.sets ?? []).length > 1 ? 'S' : ''}
                    </p>
                  </div>
                  <span className="text-sm" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', color: '#84cc16' }}>{volume.toFixed(0)} KG</span>
                </div>
              )
            })}
          </div>
          <a href="#/irlrpg/history" className="mt-3 inline-block text-xs no-underline hover:underline" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em', color: '#0ea5e9' }}>
            VOIR TOUT L'HISTORIQUE →
          </a>
        </div>
      )}

      {recent.length === 0 && (
        <div className="card-neon text-center py-8">
          <p className="text-sm mb-4" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', letterSpacing: '0.06em', color: '#475569' }}>AUCUNE SÉANCE. INITIALISEZ VOTRE PREMIÈRE MISSION.</p>
          <a href="#/irlrpg/workout" className="btn-neon-lime">▶ DÉMARRER</a>
        </div>
      )}
    </div>
  )
}
