import { useCallback, useEffect, useState } from 'react'
import api from '../api.ts'
import { useAuth } from '../useAuth.ts'
import type { Character, City } from '../Dashboard/types.ts'
import BuyModal from './BuyModal.tsx'
import CitySelector from './CitySelector.tsx'
import MarketTable from './MarketTable.tsx'
import OrderCard from './OrderCard.tsx'
import ProfitChart from './ProfitChart.tsx'
import SellPanel from './SellPanel.tsx'
import type {
  MarketPriceItem,
  MerchantInventoryItem,
  MerchantOrderItem,
  MerchantStats,
} from './types.ts'

type Tab = 'market' | 'orders' | 'resell' | 'history' | 'stats'

const TABS: { key: Tab; label: string }[] = [
  { key: 'market', label: 'Marché' },
  { key: 'orders', label: 'Commandes' },
  { key: 'resell', label: 'Revente' },
  { key: 'history', label: 'Historique' },
  { key: 'stats', label: 'Statistiques' },
]

export default function MerchantPage() {
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('market')
  const [cities, setCities] = useState<City[]>([])
  const [characters, setCharacters] = useState<Character[]>([])

  // Selections
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)

  // Market
  const [marketItems, setMarketItems] = useState<MarketPriceItem[]>([])
  const [marketLoading, setMarketLoading] = useState(false)

  // Orders (active: pending/in_transit/delivered)
  const [orders, setOrders] = useState<MerchantOrderItem[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // History (all orders)
  const [history, setHistory] = useState<MerchantOrderItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'in_transit' | 'delivered' | 'sold' | 'cancelled'>('all')

  // Inventory (for resell tab)
  const [inventory, setInventory] = useState<MerchantInventoryItem[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)

  // Stats
  const [stats, setStats] = useState<MerchantStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Modals
  const [buyItem, setBuyItem] = useState<MarketPriceItem | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Load initial data
  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get<City[]>('/economy/cities/'),
      api.get<Character[]>('/characters/'),
    ]).then(([citiesRes, charRes]) => {
      if (cancelled) return
      setCities(citiesRes.data)

      const merchantChars = charRes.data.filter(
        (c) => c.player === user?.id && c.class_type.toLowerCase() === 'marchand',
      )
      setCharacters(merchantChars)

      // Auto-select first merchant character and its campaign
      if (merchantChars.length > 0) {
        setSelectedCharacterId(merchantChars[0].id)
        setSelectedCampaignId(merchantChars[0].campaign)
      }
      if (citiesRes.data.length > 0) {
        setSelectedCityId(citiesRes.data[0].id)
      }
    }).catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [user?.id])

  // Load market when city/campaign change
  const loadMarket = useCallback(async () => {
    if (!selectedCityId || !selectedCampaignId) return
    setMarketLoading(true)
    try {
      const res = await api.get<MarketPriceItem[]>('/economy/market/', {
        params: { city: selectedCityId, campaign: selectedCampaignId },
      })
      setMarketItems(res.data)
    } catch { /* silent */ }
    finally { setMarketLoading(false) }
  }, [selectedCityId, selectedCampaignId])

  useEffect(() => {
    if (tab === 'market') void loadMarket()
  }, [tab, loadMarket])

  // Load orders (active only: pending, in_transit, delivered)
  const loadOrders = useCallback(async () => {
    if (!selectedCharacterId) return
    setOrdersLoading(true)
    try {
      const res = await api.get<MerchantOrderItem[]>('/merchant/orders/', {
        params: { character: selectedCharacterId },
      })
      setOrders(res.data.filter((o) =>
        o.status === 'pending' || o.status === 'in_transit' || o.status === 'delivered',
      ))
    } catch { /* silent */ }
    finally { setOrdersLoading(false) }
  }, [selectedCharacterId])

  useEffect(() => {
    if (tab === 'orders') void loadOrders()
  }, [tab, loadOrders])

  // Load history (all orders)
  const loadHistory = useCallback(async () => {
    if (!selectedCharacterId) return
    setHistoryLoading(true)
    try {
      const res = await api.get<MerchantOrderItem[]>('/merchant/orders/', {
        params: { character: selectedCharacterId },
      })
      setHistory(res.data)
    } catch { /* silent */ }
    finally { setHistoryLoading(false) }
  }, [selectedCharacterId])

  useEffect(() => {
    if (tab === 'history') void loadHistory()
  }, [tab, loadHistory])

  // Load inventory
  const loadInventory = useCallback(async () => {
    if (!selectedCharacterId) return
    setInventoryLoading(true)
    try {
      const res = await api.get<MerchantInventoryItem[]>('/merchant/inventory/', {
        params: { character: selectedCharacterId },
      })
      setInventory(res.data)
    } catch { /* silent */ }
    finally { setInventoryLoading(false) }
  }, [selectedCharacterId])

  useEffect(() => {
    if (tab === 'resell') void loadInventory()
  }, [tab, loadInventory])

  // Load stats
  const loadStats = useCallback(async () => {
    if (!selectedCharacterId) return
    setStatsLoading(true)
    try {
      const res = await api.get<MerchantStats>('/merchant/stats/', {
        params: { character: selectedCharacterId },
      })
      setStats(res.data)
    } catch { /* silent */ }
    finally { setStatsLoading(false) }
  }, [selectedCharacterId])

  useEffect(() => {
    if (tab === 'stats') void loadStats()
  }, [tab, loadStats])

  // Buy action
  const handleBuy = async (quantity: number) => {
    if (!buyItem || !selectedCharacterId || !selectedCampaignId || !selectedCityId) return
    setModalLoading(true)
    try {
      await api.post('/merchant/orders/', {
        resource_id: buyItem.resource_id,
        quantity,
        buy_city_id: selectedCityId,
        character_id: selectedCharacterId,
        campaign_id: selectedCampaignId,
      })
      setBuyItem(null)
      void loadMarket()
      void loadOrders()
    } catch { /* silent */ }
    finally { setModalLoading(false) }
  }

  // Sell from inventory (resell tab)
  const handleSellFromInventory = async (inventoryItemId: number, sellCityId: number, quantity: number) => {
    if (!selectedCharacterId) return
    const invItem = inventory.find((i) => i.id === inventoryItemId)
    if (!invItem) return
    await api.post('/merchant/inventory/', {
      character_id: selectedCharacterId,
      resource_id: invItem.resource,
      quantity,
      sell_city_id: sellCityId,
    })
    void loadInventory()
    void loadStats()
  }

  if (characters.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-primary dark:text-primaryLight mb-2">
          Comptoir Commercial
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Aucun personnage de classe Marchand trouvé. Créez un personnage marchand pour accéder au comptoir.
        </p>
        <a href="#/jdr/dashboard" className="btn btn-primary mt-4 inline-block">
          Retour au dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">
            Comptoir Commercial
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Système de commerce inter-villes du monde de Lug
          </p>
        </div>

        {/* Character & campaign selectors */}
        <div className="flex flex-wrap gap-3">
          {characters.length > 1 && (
            <select
              value={selectedCharacterId ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                setSelectedCharacterId(id)
                const char = characters.find((c) => c.id === id)
                if (char) setSelectedCampaignId(char.campaign)
              }}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {characters.length === 1 && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center">
              {characters[0].name}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary dark:border-primaryLight text-primary dark:text-primaryLight'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'market' && (
        <div className="space-y-4">
          <CitySelector
            cities={cities}
            selectedId={selectedCityId}
            onChange={(id) => { setSelectedCityId(id); }}
            label="Ville"
          />
          <MarketTable
            items={marketItems}
            loading={marketLoading}
            onBuy={(item) => setBuyItem(item)}
          />
        </div>
      )}

      {tab === 'orders' && (
        <div>
          {ordersLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Chargement des commandes…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Aucune commande en cours.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orders.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'resell' && (
        <SellPanel
          items={inventory}
          loading={inventoryLoading}
          cities={cities}
          onSellConfirm={handleSellFromInventory}
        />
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['all', 'pending', 'in_transit', 'delivered', 'sold', 'cancelled'] as const).map((f) => {
              const labels: Record<string, string> = {
                all: 'Tous', pending: 'En attente', in_transit: 'En transit',
                delivered: 'Livrés', sold: 'Vendus', cancelled: 'Annulés',
              }
              return (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    historyFilter === f
                      ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {labels[f]}
                </button>
              )
            })}
          </div>
          {historyLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Chargement…</p>
          ) : history.filter((o) => historyFilter === 'all' || o.status === historyFilter).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Aucun historique.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {history
                .filter((o) => historyFilter === 'all' || o.status === historyFilter)
                .map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <ProfitChart stats={stats} loading={statsLoading} />
      )}

      {/* Modals */}
      {buyItem && (
        <BuyModal
          item={buyItem}
          onConfirm={handleBuy}
          onClose={() => setBuyItem(null)}
          loading={modalLoading}
        />
      )}

    </div>
  )
}
