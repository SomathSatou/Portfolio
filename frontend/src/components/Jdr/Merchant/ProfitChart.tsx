import type { MerchantStats } from './types'

interface Props {
  stats: MerchantStats | null
  loading: boolean
}

export default function ProfitChart({ stats, loading }: Props) {
  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Chargement des statistiques…</p>
  }

  if (!stats) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Aucune donnée disponible.</p>
  }

  const maxProfit = Math.max(
    ...stats.profit_by_session.map((s) => Math.abs(s.session_profit)),
    1,
  )

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Bénéfice total" value={`${stats.total_profit.toFixed(2)} po`} positive={stats.total_profit >= 0} />
        <StatCard label="Revenus totaux" value={`${stats.total_revenue.toFixed(2)} po`} />
        <StatCard label="Coûts totaux" value={`${stats.total_cost.toFixed(2)} po`} />
        <StatCard label="Transactions" value={String(stats.trade_count)} />
      </div>

      {/* Simple bar chart */}
      {stats.profit_by_session.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Bénéfice par session</h4>
          <div className="flex items-end gap-1 h-32">
            {stats.profit_by_session.map((s) => {
              const height = Math.max(Math.abs(s.session_profit) / maxProfit * 100, 4)
              const isPositive = s.session_profit >= 0
              return (
                <div
                  key={s.created_at_session}
                  className="flex-1 flex flex-col items-center justify-end"
                  title={`Session ${s.created_at_session}: ${s.session_profit.toFixed(2)} po`}
                >
                  <div
                    className={`w-full rounded-t-sm transition-all ${isPositive ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    S{s.created_at_session}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Best routes */}
      {stats.best_routes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Meilleures routes commerciales</h4>
          <div className="space-y-2">
            {stats.best_routes.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-800"
              >
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="font-medium">{r.buy_city__name}</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span className="font-medium">{r.sell_city__name}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">({r.resource__name})</span>
                </div>
                <span className={`font-mono text-sm font-bold ${r.route_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {r.route_profit >= 0 ? '+' : ''}{r.route_profit.toFixed(2)} po
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-lg font-bold font-mono mt-1 ${positive === true ? 'text-green-600 dark:text-green-400' : positive === false ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
    </div>
  )
}
