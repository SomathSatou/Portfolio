import type { MerchantOrderItem } from './types'

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  in_transit: { label: 'En transit', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  delivered: { label: 'Livré', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  sold: { label: 'Vendu', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
}

interface Props {
  order: MerchantOrderItem
}

export default function OrderCard({ order }: Props) {
  const cfg = statusConfig[order.status] ?? statusConfig.pending
  const progressPct = order.transit_sessions > 0
    ? Math.round(((order.transit_sessions - order.sessions_remaining) / order.transit_sessions) * 100)
    : 100

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            {order.quantity}× {order.resource_name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Acheté à {order.buy_city_name} — {parseFloat(order.buy_price_unit).toFixed(2)} po/{order.resource_unit}
          </p>
        </div>
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Progress bar for transit */}
      {(order.status === 'in_transit' || order.status === 'pending') && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Transit</span>
            <span>{order.sessions_remaining} session{order.sessions_remaining !== 1 ? 's' : ''} restante{order.sessions_remaining !== 1 ? 's' : ''}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary dark:bg-primaryLight rounded-full h-2 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Cost info */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Coût total</span>
        <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
          {parseFloat(order.total_cost).toFixed(2)} po
        </span>
      </div>

      {/* Sold info */}
      {order.status === 'sold' && order.sell_city_name && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Vendu à {order.sell_city_name}</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">
              {order.total_revenue ? parseFloat(order.total_revenue).toFixed(2) : '—'} po
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Bénéfice</span>
            <span className={`font-mono font-bold ${order.profit && parseFloat(order.profit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {order.profit ? `${parseFloat(order.profit) >= 0 ? '+' : ''}${parseFloat(order.profit).toFixed(2)}` : '—'} po
            </span>
          </div>
        </>
      )}

    </div>
  )
}
