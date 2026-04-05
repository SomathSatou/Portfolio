export interface Campaign {
  id: number
  name: string
  description: string
  game_master: number
  game_master_name: string
  created_at: string
  is_active: boolean
  current_session_number: number
  invite_code: string | null
  member_count: number
  city_count: number
}

export interface City {
  id: number
  name: string
  description: string
  export_count: number
  import_count: number
}

export interface Character {
  id: number
  name: string
  player: number
  player_name: string
  campaign: number
  campaign_name: string
  class_type: string
  level: number
  description: string
  avatar: string | null
  stats: Record<string, number | string>
  gold: number
  silver: number
  copper: number
  created_at: string
}

export interface CharacterWithStats extends Character {
  character_stats: CharacterStat[]
}

export interface Notification {
  id: number
  recipient: number
  title: string
  message: string
  notification_type: 'info' | 'alert' | 'intersession' | 'lore' | 'message'
  is_read: boolean
  link: string | null
  created_at: string
}

export interface CampaignMember {
  id: number
  campaign: number
  player: number
  player_name: string
  joined_at: string
  is_active: boolean
}

export interface Spell {
  id: number
  campaign: number
  name: string
  description: string
  level: number
  mana_cost: number
  damage: string
  range_distance: string
  casting_time: string
  duration: string
  school: string
  extra: Record<string, unknown>
  created_at: string
}

export interface Item {
  id: number
  campaign: number
  resource: number | null
  resource_name: string
  name: string
  description: string
  rarity: string
  item_type: string
  weight: number
  value: number
  properties: Record<string, unknown>
  is_magical: boolean
  created_at: string
}

export interface Stat {
  id: number
  campaign: number
  name: string
  display_order: number
}

export interface CharacterStat {
  id: number
  character: number
  stat: number
  stat_name: string
  value: number
}

export interface CharacterSpell {
  id: number
  character: number
  spell: number
  spell_name: string
  spell_level: number
  spell_description: string
  spell_school: string
  spell_mana_cost: number
  notes: string
  acquired_at: string
}

export interface CharacterItem {
  id: number
  character: number
  item: number
  item_name: string
  item_rarity: string
  item_type: string
  item_description: string
  item_is_magical: boolean
  quantity: number
  is_equipped: boolean
  notes: string
  acquired_at: string
}

export interface CampaignEvent {
  id: number
  campaign: number
  event_type: string
  actor: number | null
  actor_name: string
  message: string
  link_hash: string
  created_at: string
}

export interface SessionNote {
  id: number
  campaign: number
  content: string
  is_private: boolean
  updated_at: string
  created_at: string
}

export interface ChatMessage {
  id: number
  campaign: number
  author: number
  author_name: string
  author_avatar: string | null
  content: string
  is_dice_roll: boolean
  dice_result: {
    command: string
    rolls: number[]
    total: number
  } | null
  created_at: string
}
