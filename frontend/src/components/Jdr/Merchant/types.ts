export interface City {
  id: number
  name: string
  description: string
  export_count: number
  import_count: number
}

export interface CityDetail {
  id: number
  name: string
  description: string
  exports: CityExportItem[]
  imports: CityImportItem[]
}

export interface CityExportItem {
  id: number
  resource_id: number
  resource_name: string
  craft_type: string
  unit: string
  price: string
  availability: string
}

export interface CityImportItem {
  id: number
  resource_id: number
  resource_name: string
  craft_type: string
  unit: string
  price: string
  origin_city_name: string
}

export interface MarketPriceItem {
  id: number
  city_export_id: number
  resource_id: number
  resource_name: string
  craft_type: string
  unit: string
  availability: string
  base_price: string
  current_price: string
  session_number: number
  trend: 'up' | 'down' | 'stable'
}

export interface MerchantOrderItem {
  id: number
  character: number
  character_name: string
  campaign: number
  resource: number
  resource_name: string
  resource_unit: string
  quantity: number
  buy_city: number
  buy_city_name: string
  buy_price_unit: string
  sell_city: number | null
  sell_city_name: string | null
  sell_price_unit: string | null
  status: 'pending' | 'in_transit' | 'delivered' | 'sold' | 'cancelled'
  transit_sessions: number
  sessions_remaining: number
  created_at_session: number
  total_cost: string
  total_revenue: string | null
  profit: string | null
  created_at: string
}

export interface MerchantInventoryItem {
  id: number
  character: number
  resource: number
  resource_name: string
  resource_unit: string
  craft_type: string
  quantity: number
  average_buy_price: string
}

export interface MerchantStats {
  total_profit: number
  total_revenue: number
  total_cost: number
  trade_count: number
  profit_by_session: { created_at_session: number; session_profit: number }[]
  best_routes: {
    buy_city__name: string
    sell_city__name: string
    resource__name: string
    route_profit: number
  }[]
}
