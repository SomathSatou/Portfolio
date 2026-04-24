import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'

const RANK_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  argent: '#c0c0c0',
  or: '#ffd700',
  platine: '#e5e4e2',
  diamant: '#b9f2ff',
  master: '#9b59b6',
  legende: '#ff4500',
}

interface MuscleXP {
  muscle_name: string
  muscle_group: string
  xp: number
  level: number
}

interface TotalXP {
  xp: number
  level: number
  rank: string
}

interface BadgeData {
  id: number
  badge: { id: number; name: string; description: string; icon: string }
  earned_at: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [muscles, setMuscles] = React.useState<MuscleXP[]>([])
  const [total, setTotal] = React.useState<TotalXP>({ xp: 0, level: 1, rank: 'bronze' })
  const [badges, setBadges] = React.useState<BadgeData[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      api.get<{ muscles: MuscleXP[]; total: TotalXP }>('/xp/'),
      api.get<BadgeData[]>('/my-badges/'),
    ]).then(([xpRes, badgesRes]) => {
      setMuscles(xpRes.data.muscles)
      setTotal(xpRes.data.total)
      setBadges(badgesRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Chargement…</p>

  const rankColor = RANK_COLORS[total.rank] || '#cd7f32'
  const rankLabel = total.rank.charAt(0).toUpperCase() + total.rank.slice(1)

  // Group muscles by muscle_group
  const grouped = muscles.reduce<Record<string, MuscleXP[]>>((acc, m) => {
    if (!acc[m.muscle_group]) acc[m.muscle_group] = []
    acc[m.muscle_group].push(m)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-primary dark:text-primaryLight">
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">{user?.username}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-semibold" style={{ color: rankColor }}>{rankLabel}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Niveau {total.level}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{total.xp} XP</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Badges ({badges.length})</h2>
          <div className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm" title={b.badge.description}>
                <span>{b.badge.icon}</span>
                <span className="text-gray-700 dark:text-gray-300">{b.badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Muscle XP by group */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">XP par muscle</h2>
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-4">
            <h3 className="text-sm font-medium text-primary dark:text-primaryLight mb-2">{group}</h3>
            <div className="space-y-2">
              {items.map((m) => (
                <div key={m.muscle_name} className="flex items-center gap-3">
                  <span className="w-36 text-sm text-gray-700 dark:text-gray-300 truncate">{m.muscle_name}</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary dark:bg-primaryLight"
                      style={{ width: `${Math.min(100, (m.xp / Math.max(total.xp, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                    Niv. {m.level} ({m.xp})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {muscles.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Pas encore d'XP. Terminez une séance !</p>
        )}
      </div>
    </div>
  )
}
