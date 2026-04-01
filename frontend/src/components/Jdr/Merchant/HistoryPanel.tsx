import { useMemo, useState } from 'react'
import type { MerchantOrderItem } from './types.ts'
import OrderCard from './OrderCard.tsx'

interface Props {
  orders: MerchantOrderItem[]
  loading: boolean
}

export default function HistoryPanel({ orders, loading }: Props) {
  const [filterResource, setFilterResource] = useState('')
  const [filterBuyCity, setFilterBuyCity] = useState('')
  const [filterSellCity, setFilterSellCity] = useState('')

  const historyOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'sold' || o.status === 'cancelled')
      .filter((o) => !filterResource || o.resource_name.toLowerCase().includes(filterResource.toLowerCase()))
      .filter((o) => !filterBuyCity || o.buy_city_name === filterBuyCity)
      .filter((o) => !filterSellCity || o.sell_city_name === filterSellCity)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [orders, filterResource, filterBuyCity, filterSellCity])

  const buyCities = useMemo(() => {
    const set = new Set(
      orders.filter((o) => o.status === 'sold' || o.status === 'cancelled').map((o) => o.buy_city_name),
    )
    return Array.from(set).sort()
  }, [orders])

  const sellCities = useMemo(() => {
    const set = new Set(
      orders
        .filter((o) => (o.status === 'sold' || o.status === 'cancelled') && o.sell_city_name)
        .map((o) => o.sell_city_name!),
    )
    return Array.from(set).sort()
  }, [orders])

  const totalProfit = useMemo(() => {
    return historyOrders.reduce((sum, o) => sum + (o.profit ? parseFloat(o.profit) : 0), 0)
  }, [historyOrders])

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Chargement de l'historique…</p>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filtrer par ressource…"
          value={filterResource}
          onChange={(e) => setFilterResource(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[180px]"
        />

        <select
          value={filterBuyCity}
          onChange={(e) => setFilterBuyCity(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Toutes les villes d'achat</option>
          {buyCities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={filterSellCity}
          onChange={(e) => setFilterSellCity(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Toutes les villes de vente</option>
          {sellCities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {historyOrders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Aucun historique.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {historyOrders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}

      {/* Total profit */}
      {historyOrders.length > 0 && (
        <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400 mr-2">Bénéfice total :</span>
            <span className={`font-mono font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} po
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
