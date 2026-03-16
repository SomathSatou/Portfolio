import type { GardenStats, HarvestLogItem } from './types.ts'
import { RARITY_BADGE } from './types.ts'

interface Props {
  stats: GardenStats | null
  history: HarvestLogItem[]
  statsLoading: boolean
  historyLoading: boolean
}

export default function GardenStatsView({ stats, history, statsLoading, historyLoading }: Props) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {statsLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Chargement…</p>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total récolté</p>
              <p className="text-2xl font-bold text-accent2 dark:text-accent1">{stats.total_harvested}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total vendu</p>
              <p className="text-2xl font-bold text-primary dark:text-primaryLight">{stats.total_sold}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:col-span-1 col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Revenus totaux</p>
              <p className="text-2xl font-bold text-accent3">{stats.total_revenue.toFixed(2)} po</p>
            </div>
          </div>

          {/* Top plants */}
          {stats.top_plants.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Plantes les plus récoltées</h3>
              <div className="space-y-2">
                {stats.top_plants.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                    <span className="font-medium text-accent2 dark:text-accent1">×{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue by session */}
          {stats.revenue_by_session.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Revenus par session</h3>
              <div className="space-y-1">
                {stats.revenue_by_session.map((s) => {
                  const maxRev = Math.max(...stats.revenue_by_session.map((r) => r.revenue), 1)
                  const pct = (s.revenue / maxRev) * 100
                  return (
                    <div key={s.session} className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Sess. {s.session}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent1 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-accent3 w-16 text-right">{s.revenue.toFixed(0)} po</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Aucune statistique disponible.</p>
      )}

      {/* Harvest history */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Historique des récoltes</h3>
        {historyLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Chargement…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Aucune récolte pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Plante</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-center">Qté</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-center">Session</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Statut</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Prix</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2">
                      <span className="mr-1">{h.plant_icon}</span>
                      <span className="text-gray-800 dark:text-gray-200">{h.plant_name}</span>
                    </td>
                    <td className="py-2 text-center text-gray-700 dark:text-gray-300">×{h.quantity}</td>
                    <td className="py-2 text-center text-gray-500 dark:text-gray-400">{h.harvested_at_session}</td>
                    <td className="py-2 text-right">
                      {h.sold ? (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${RARITY_BADGE['Peu commune']}`}>
                          Vendu
                        </span>
                      ) : (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${RARITY_BADGE['Commune']}`}>
                          En stock
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right text-accent3">
                      {h.sold && h.sell_price_total ? `${h.sell_price_total} po` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
