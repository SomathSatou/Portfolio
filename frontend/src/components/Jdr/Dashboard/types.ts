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
  created_at: string
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
