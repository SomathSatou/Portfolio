import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import { Spinner } from '../../ui'

interface FieldError {
  username?: string
  email?: string
  non_field?: string
}

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
  const { user, updateProfile } = useAuth()
  const [muscles, setMuscles] = React.useState<MuscleXP[]>([])
  const [total, setTotal] = React.useState<TotalXP>({ xp: 0, level: 1, rank: 'bronze' })
  const [badges, setBadges] = React.useState<BadgeData[]>([])
  const [loading, setLoading] = React.useState(true)

  const [username, setUsername] = React.useState(user?.username ?? '')
  const [email, setEmail] = React.useState(user?.email ?? '')
  const [saving, setSaving] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)
  const [errors, setErrors] = React.useState<FieldError>({})

  React.useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email)
    }
  }, [user])

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setSaveSuccess(false)

    if (!username.trim() || !email.trim()) {
      setErrors({ non_field: 'Veuillez remplir tous les champs.' })
      return
    }

    setSaving(true)
    try {
      await updateProfile({ username: username.trim(), email: email.trim() })
      setSaveSuccess(true)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } }).response?.data
      if (data) {
        const next: FieldError = {}
        if (data.username) next.username = data.username.join(' ')
        if (data.email) next.email = data.email.join(' ')
        if (data.non_field_errors || data.detail) {
          next.non_field = (data.non_field_errors ?? data.detail).join(' ')
        }
        setErrors(next)
      } else {
        setErrors({ non_field: 'Échec de la mise à jour. Réessayez.' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center gap-3 animate-fadeIn" style={{ color: 'var(--color-irlrpg-primary)' }}>
      <Spinner size="sm" />
      <span className="neon-label">CHARGEMENT…</span>
    </div>
  )

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
      {/* Header / Edit profile */}
      <form onSubmit={onSubmit} className="card-neon">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold neon-avatar">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="title-neon text-xl">PROFIL</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-semibold neon-rank" style={{ color: rankColor }}>{rankLabel}</span>
              <span className="neon-text-sm">NIVEAU {total.level}</span>
              <span className="neon-text-sm">{total.xp} XP</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block neon-label mb-1">PSEUDO</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-neon w-full"
              placeholder="Votre pseudo"
            />
            {errors.username && <p className="neon-error-xs mt-1">{errors.username}</p>}
          </div>
          <div>
            <label className="block neon-label mb-1">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-neon w-full"
              placeholder="votre@email.com"
            />
            {errors.email && <p className="neon-error-xs mt-1">{errors.email}</p>}
          </div>
        </div>

        {errors.non_field && <p className="neon-error mb-3">{errors.non_field}</p>}
        {saveSuccess && <p className="neon-success mb-3">PROFIL MIS À JOUR AVEC SUCCÈS.</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-neon-lime">
            {saving ? 'SAUVEGARDE…' : 'SAUVEGARDER'}
          </button>
        </div>
      </form>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="card-neon">
          <h2 className="neon-subtitle mb-3">BADGES ({badges.length})</h2>
          <div className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full neon-badge text-sm" title={b.badge.description}>
                <span>{b.badge.icon}</span>
                <span className="neon-badge-text">{b.badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Muscle XP by group */}
      <div className="card-neon">
        <h2 className="neon-subtitle mb-4">XP PAR MUSCLE</h2>
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-4">
            <h3 className="neon-group-title mb-2">{group}</h3>
            <div className="space-y-2">
              {items.map((m) => (
                <div key={m.muscle_name} className="flex items-center gap-3">
                  <span className="w-36 text-sm neon-muscle-name truncate">{m.muscle_name}</span>
                  <div className="flex-1 neon-progress-bg rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full neon-progress-fill"
                      style={{ width: `${Math.min(100, (m.xp / Math.max(total.xp, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="neon-xp-text w-20 text-right">
                    NIV. {m.level} ({m.xp})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {muscles.length === 0 && (
          <p className="neon-empty-text">PAS ENCORE D'XP. TERMINEZ UNE SÉANCE !</p>
        )}
      </div>
    </div>
  )
}
