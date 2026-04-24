import React from 'react'
import api from '../api'

const RANK_COLORS: Record<string, string> = {
  bronze: '#cd7f32', argent: '#c0c0c0', or: '#ffd700', platine: '#e5e4e2',
  diamant: '#b9f2ff', master: '#9b59b6', legende: '#ff4500',
}

interface LeaderboardEntry {
  rank: number
  user: { id: number; username: string; rank_tier: string }
  xp: number
  level: number
  workouts: number
  volume: number
}

interface LeaderboardResponse {
  results: LeaderboardEntry[]
  my_rank: number | null
  total: number
  page: number
  pages: number
}

interface Gym { id: number; name: string }

export default function LeaderboardPage() {
  const [data, setData] = React.useState<LeaderboardResponse | null>(null)
  const [gyms, setGyms] = React.useState<Gym[]>([])
  const [loading, setLoading] = React.useState(true)

  const [scope, setScope] = React.useState('global')
  const [gymId, setGymId] = React.useState('')
  const [period, setPeriod] = React.useState('all')
  const [sort, setSort] = React.useState('xp')
  const [page, setPage] = React.useState(1)

  const fetchLeaderboard = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ scope, period, sort, page: String(page) })
      if (scope === 'gym' && gymId) params.set('gym_id', gymId)
      const res = await api.get<LeaderboardResponse>(`/leaderboard/?${params}`)
      setData(res.data)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [scope, gymId, period, sort, page])

  React.useEffect(() => {
    api.get<Gym[]>('/gyms/').then((r) => setGyms(r.data)).catch(() => {})
  }, [])

  React.useEffect(() => { void fetchLeaderboard() }, [fetchLeaderboard])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Classement</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={scope} onChange={(e) => { setScope(e.target.value); setPage(1) }}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
          <option value="global">Global</option>
          <option value="gym">Par salle</option>
        </select>
        {scope === 'gym' && (
          <select value={gymId} onChange={(e) => { setGymId(e.target.value); setPage(1) }}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
            <option value="">— Salle —</option>
            {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1) }}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
          <option value="all">Tout temps</option>
          <option value="month">Ce mois</option>
          <option value="week">Cette semaine</option>
          <option value="day">Aujourd'hui</option>
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
          <option value="xp">XP</option>
          <option value="workouts">Séances</option>
          <option value="volume">Volume</option>
        </select>
      </div>

      {loading && <p className="text-gray-500 dark:text-gray-400">Chargement…</p>}

      {data && !loading && (
        <>
          {data.my_rank && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Votre position : <span className="font-bold text-primary dark:text-primaryLight">#{data.my_rank}</span> sur {data.total}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 px-2 w-12">#</th>
                  <th className="py-2 px-2">Joueur</th>
                  <th className="py-2 px-2 text-right">XP</th>
                  <th className="py-2 px-2 text-right hidden sm:table-cell">Niveau</th>
                  <th className="py-2 px-2 text-right hidden sm:table-cell">Séances</th>
                  <th className="py-2 px-2 text-right hidden md:table-cell">Volume</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((entry) => (
                  <tr key={entry.user.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-2 font-bold text-gray-400">{entry.rank}</td>
                    <td className="py-2 px-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{entry.user.username}</span>
                      <span className="ml-2 text-xs font-semibold" style={{ color: RANK_COLORS[entry.user.rank_tier] || '#cd7f32' }}>
                        {entry.user.rank_tier}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{entry.xp.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">{entry.level}</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">{entry.workouts}</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300 hidden md:table-cell">{entry.volume.toLocaleString()} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="btn btn-outline text-xs px-3 py-1"
              >
                ←
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 self-center">
                {page} / {data.pages}
              </span>
              <button
                onClick={() => setPage(Math.min(data.pages, page + 1))}
                disabled={page >= data.pages}
                className="btn btn-outline text-xs px-3 py-1"
              >
                →
              </button>
            </div>
          )}
        </>
      )}

      {data && data.results.length === 0 && !loading && (
        <p className="text-gray-500 dark:text-gray-400">Aucun résultat pour ces critères.</p>
      )}
    </div>
  )
}
