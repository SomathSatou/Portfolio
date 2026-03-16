import { useCallback, useEffect, useState } from 'react'
import api from '../api.ts'
import { useAuth } from '../useAuth.ts'
import type { Character } from '../Dashboard/types.ts'
import type {
  AlchemyPlant,
  GardenData,
  GardenStats,
  HarvestLogItem,
  InventoryItem,
} from './types.ts'
import GardenGrid from './GardenGrid.tsx'
import PlantCatalog from './PlantCatalog.tsx'
import PlantModal from './PlantModal.tsx'
import HarvestInventory from './HarvestInventory.tsx'
import GardenStatsView from './GardenStatsView.tsx'

type Tab = 'garden' | 'catalog' | 'inventory' | 'stats'

const TABS: { key: Tab; label: string }[] = [
  { key: 'garden', label: 'Jardin' },
  { key: 'catalog', label: 'Catalogue' },
  { key: 'inventory', label: 'Inventaire' },
  { key: 'stats', label: 'Statistiques' },
]

export default function GardenPage() {
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('garden')
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)

  // Garden
  const [gardenData, setGardenData] = useState<GardenData | null>(null)
  const [gardenLoading, setGardenLoading] = useState(false)

  // Catalog
  const [plants, setPlants] = useState<AlchemyPlant[]>([])
  const [plantsLoading, setPlantsLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')

  // Plant modal
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null)
  const [plantingPlotId, setPlantingPlotId] = useState<number | null>(null)
  const [planting, setPlanting] = useState(false)

  // Inventory
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [selling, setSelling] = useState(false)

  // Stats
  const [stats, setStats] = useState<GardenStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [history, setHistory] = useState<HarvestLogItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // Load characters
  useEffect(() => {
    let cancelled = false
    api.get<Character[]>('/characters/').then((res) => {
      if (cancelled) return
      // Filter cultivateur/alchimiste characters
      const gardenChars = res.data.filter(
        (c) => c.player === user?.id &&
          ['cultivateur', 'alchimiste'].includes(c.class_type.toLowerCase()),
      )
      setCharacters(gardenChars)
      if (gardenChars.length > 0) {
        setSelectedCharacterId(gardenChars[0].id)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

  // Load garden plots
  const loadGarden = useCallback(async () => {
    if (!selectedCharacterId) return
    setGardenLoading(true)
    try {
      const res = await api.get<GardenData>('/garden/plots/', {
        params: { character: selectedCharacterId },
      })
      setGardenData(res.data)
    } catch { /* silent */ }
    finally { setGardenLoading(false) }
  }, [selectedCharacterId])

  useEffect(() => {
    if (tab === 'garden') void loadGarden()
  }, [tab, loadGarden])

  // Load plants catalog
  const loadPlants = useCallback(async () => {
    setPlantsLoading(true)
    try {
      const params: Record<string, string> = {}
      if (categoryFilter) params.category = categoryFilter
      if (rarityFilter) params.rarity = rarityFilter
      const res = await api.get<AlchemyPlant[]>('/garden/plants/', { params })
      setPlants(res.data)
    } catch { /* silent */ }
    finally { setPlantsLoading(false) }
  }, [categoryFilter, rarityFilter])

  useEffect(() => {
    if (tab === 'catalog') void loadPlants()
  }, [tab, loadPlants])

  // Load inventory
  const loadInventory = useCallback(async () => {
    if (!selectedCharacterId) return
    setInventoryLoading(true)
    try {
      const res = await api.get<InventoryItem[]>('/garden/inventory/', {
        params: { character: selectedCharacterId },
      })
      setInventory(res.data)
    } catch { /* silent */ }
    finally { setInventoryLoading(false) }
  }, [selectedCharacterId])

  useEffect(() => {
    if (tab === 'inventory') void loadInventory()
  }, [tab, loadInventory])

  // Load stats & history
  const loadStats = useCallback(async () => {
    if (!selectedCharacterId) return
    setStatsLoading(true)
    try {
      const res = await api.get<GardenStats>('/garden/stats/', {
        params: { character: selectedCharacterId },
      })
      setStats(res.data)
    } catch { /* silent */ }
    finally { setStatsLoading(false) }
  }, [selectedCharacterId])

  const loadHistory = useCallback(async () => {
    if (!selectedCharacterId) return
    setHistoryLoading(true)
    try {
      const res = await api.get<HarvestLogItem[]>('/garden/history/', {
        params: { character: selectedCharacterId },
      })
      setHistory(res.data)
    } catch { /* silent */ }
    finally { setHistoryLoading(false) }
  }, [selectedCharacterId])

  useEffect(() => {
    if (tab === 'stats') {
      void loadStats()
      void loadHistory()
    }
  }, [tab, loadStats, loadHistory])

  // Actions
  const handlePlantFromGrid = (plotId: number) => {
    setPlantingPlotId(plotId)
    // Load catalog if not loaded
    if (plants.length === 0) void loadPlants()
    setTab('catalog')
  }

  const handleSelectPlant = (plant: AlchemyPlant) => {
    setSelectedPlantId(plant.id)
  }

  const handlePlantConfirm = async (plantId: number) => {
    let plotId = plantingPlotId
    // If no specific plot was selected, find first empty
    if (!plotId && gardenData) {
      const emptyPlot = gardenData.plots.find((p) => p.status === 'empty')
      if (emptyPlot) plotId = emptyPlot.id
    }
    if (!plotId) {
      showToast('Aucune parcelle vide disponible.', false)
      return
    }
    setPlanting(true)
    try {
      await api.post(`/garden/plots/${plotId}/plant/`, { plant_id: plantId })
      showToast('Plante mise en terre !', true)
      setSelectedPlantId(null)
      setPlantingPlotId(null)
      setTab('garden')
      void loadGarden()
    } catch {
      showToast('Erreur lors de la plantation.', false)
    } finally { setPlanting(false) }
  }

  const handleHarvest = async (plotId: number) => {
    try {
      const res = await api.post<{ detail: string }>(`/garden/plots/${plotId}/harvest/`)
      showToast(res.data.detail, true)
      void loadGarden()
    } catch {
      showToast('Erreur lors de la récolte.', false)
    }
  }

  const handleClear = async (plotId: number) => {
    try {
      await api.post(`/garden/plots/${plotId}/clear/`)
      showToast('Parcelle nettoyée.', true)
      void loadGarden()
    } catch {
      showToast('Erreur lors du nettoyage.', false)
    }
  }

  const handleSell = async (plantId: number, quantity: number) => {
    if (!selectedCharacterId) return
    setSelling(true)
    try {
      const res = await api.post<{ detail: string }>('/garden/sell/', {
        plant_id: plantId,
        quantity,
        character_id: selectedCharacterId,
      })
      showToast(res.data.detail, true)
      void loadInventory()
    } catch {
      showToast('Erreur lors de la vente.', false)
    } finally { setSelling(false) }
  }

  const hasEmptyPlot = gardenData ? gardenData.plots.some((p) => p.status === 'empty') : false

  if (characters.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🌱</div>
        <h2 className="text-xl font-bold text-primary dark:text-primaryLight mb-2">
          Jardin Alchimique
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Aucun personnage Cultivateur ou Alchimiste trouvé. Créez un personnage de cette classe pour accéder au jardin.
        </p>
        <a href="#/jdr/dashboard" className="btn btn-primary mt-4 inline-block">
          Retour au dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.ok
            ? 'bg-accent1/90 text-accent2'
            : 'bg-red-500/90 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-accent2 dark:text-accent1 flex items-center gap-2">
            <span>🌿</span> Jardin Alchimique
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cultivez des plantes pour l'alchimie dans le monde de Lug
          </p>
        </div>

        {/* Character selector */}
        <div className="flex flex-wrap gap-3">
          {characters.length > 1 ? (
            <select
              value={selectedCharacterId ?? ''}
              onChange={(e) => setSelectedCharacterId(Number(e.target.value))}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
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
                  ? 'border-accent2 dark:border-accent1 text-accent2 dark:text-accent1'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'garden' && (
        <div className="space-y-4">
          {gardenLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Chargement du jardin…</p>
          ) : gardenData ? (
            <>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Parcelles : {gardenData.plots.length}/{gardenData.max_plots}</span>
                {gardenData.fertilizer_bonus > 0 && (
                  <span className="text-accent1">Engrais : -{gardenData.fertilizer_bonus}%</span>
                )}
                {gardenData.special_soils.length > 0 && (
                  <span>Sols : {gardenData.special_soils.join(', ')}</span>
                )}
              </div>
              <GardenGrid
                plots={gardenData.plots}
                onPlant={handlePlantFromGrid}
                onHarvest={handleHarvest}
                onClear={handleClear}
              />
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Jardin indisponible.</p>
          )}
        </div>
      )}

      {tab === 'catalog' && (
        <PlantCatalog
          plants={plants}
          loading={plantsLoading}
          onSelect={handleSelectPlant}
          categoryFilter={categoryFilter}
          rarityFilter={rarityFilter}
          onCategoryChange={setCategoryFilter}
          onRarityChange={setRarityFilter}
        />
      )}

      {tab === 'inventory' && (
        <HarvestInventory
          items={inventory}
          loading={inventoryLoading}
          onSell={handleSell}
          selling={selling}
        />
      )}

      {tab === 'stats' && (
        <GardenStatsView
          stats={stats}
          history={history}
          statsLoading={statsLoading}
          historyLoading={historyLoading}
        />
      )}

      {/* Plant detail modal */}
      {selectedPlantId && (
        <PlantModal
          plantId={selectedPlantId}
          hasEmptyPlot={hasEmptyPlot}
          onPlant={handlePlantConfirm}
          onClose={() => { setSelectedPlantId(null); setPlantingPlotId(null) }}
          planting={planting}
        />
      )}
    </div>
  )
}
