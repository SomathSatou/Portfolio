export interface AlchemyPlant {
  id: number
  name: string
  category: string
  rarity: string
  growth_time: number
  yield_amount: number
  special_conditions: string
  sell_price: string
  icon: string
}

export interface AlchemyPlantDetail extends AlchemyPlant {
  description: string
  origin_city: number | null
  origin_city_name: string | null
  usages: PlantUsage[]
}

export interface PlantUsage {
  id: number
  recipe_name: string
  quantity_needed: number
}

export interface GardenPlot {
  id: number
  character: number
  plot_number: number
  plant: number | null
  plant_name: string | null
  plant_icon: string | null
  plant_rarity: string | null
  plant_growth_time: number | null
  plant_yield_amount: number | null
  planted_at_session: number | null
  sessions_grown: number
  is_ready: boolean
  status: 'empty' | 'growing' | 'ready' | 'withered'
}

export interface GardenData {
  plots: GardenPlot[]
  max_plots: number
  fertilizer_bonus: number
  special_soils: string[]
}

export interface InventoryItem {
  plant_id: number
  plant_name: string
  plant_icon: string
  plant_rarity: string
  sell_price: number
  quantity: number
}

export interface HarvestLogItem {
  id: number
  character: number
  plant: number
  plant_name: string
  plant_icon: string
  quantity: number
  harvested_at_session: number
  sold: boolean
  sell_price_total: string | null
}

export interface GardenStats {
  total_harvested: number
  total_sold: number
  total_revenue: number
  top_plants: { name: string; count: number }[]
  revenue_by_session: { session: number; revenue: number }[]
}

export const RARITY_COLORS: Record<string, string> = {
  'Commune': 'border-gray-400 dark:border-gray-500',
  'Peu commune': 'border-green-500 dark:border-green-400',
  'Rare': 'border-blue-500 dark:border-blue-400',
  'Très rare': 'border-primary dark:border-primaryLight',
  'Légendaire': 'border-accent3 dark:border-accent3',
}

export const RARITY_BADGE: Record<string, string> = {
  'Commune': 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  'Peu commune': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Rare': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Très rare': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'Légendaire': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
}

export const CATEGORIES = [
  'Herbes', 'Fleurs', 'Racines', 'Champignons', 'Algues', 'Résines', 'Mousses', 'Cristaux',
] as const

export const RARITIES = [
  'Commune', 'Peu commune', 'Rare', 'Très rare', 'Légendaire',
] as const
