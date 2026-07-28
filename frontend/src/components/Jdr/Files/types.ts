export interface SharedFolderAccess {
  id: number
  folder: number
  player: number
  player_name: string
  can_edit: boolean
  can_upload: boolean
}

export interface SharedFolder {
  id: number
  campaign: number
  campaign_name: string
  name: string
  description: string
  category: FolderCategory
  access_level: AccessLevel
  created_by: number
  created_by_name: string
  created_at: string
  access_entries: SharedFolderAccess[]
  file_count: number
}

export interface SharedFile {
  id: number
  folder: number
  url: string | null
  original_name: string
  content_type: string
  size: number
  uploaded_by: number
  uploaded_by_name: string
  uploaded_at: string
}

export interface FolderContentResponse {
  folder_id: number
  folder_name: string
  files: SharedFile[]
  can_upload: boolean
}

export type FolderCategory = 'lore' | 'maps' | 'illustrations' | 'music' | 'rules' | 'notes' | 'other'
export type AccessLevel = 'all_players' | 'mj_only' | 'specific_players'

export const CATEGORY_LABEL: Record<FolderCategory, string> = {
  lore: 'Lore & Histoire',
  maps: 'Cartes',
  illustrations: 'Illustrations',
  music: 'Musiques & Ambiances',
  rules: 'Règles & Références',
  notes: 'Notes de session',
  other: 'Autre',
}

export const CATEGORY_ICON: Record<FolderCategory, string> = {
  lore: '📜',
  maps: '🗺️',
  illustrations: '🎨',
  music: '🎵',
  rules: '📋',
  notes: '📝',
  other: '📁',
}

export const ACCESS_LEVEL_LABEL: Record<AccessLevel, string> = {
  all_players: 'Tous les joueurs',
  mj_only: 'MJ uniquement',
  specific_players: 'Joueurs spécifiques',
}

export const ACCESS_LEVEL_BADGE: Record<AccessLevel, string> = {
  all_players: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  mj_only: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  specific_players: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
}

export const CATEGORIES: FolderCategory[] = ['lore', 'maps', 'illustrations', 'music', 'rules', 'notes', 'other']
