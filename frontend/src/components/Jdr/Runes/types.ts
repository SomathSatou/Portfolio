export interface RuneTemplate {
  id: number
  name: string
  difficulty: 'apprenti' | 'adepte' | 'maître' | 'archimage'
  category: 'protection' | 'attaque' | 'soin' | 'utilité' | 'invocation'
  reference_image: string | null
  mana_cost: number
}

export interface RuneTemplateDetail extends RuneTemplate {
  description: string
  effect_description: string
  required_materials: Record<string, number>
}

export interface RuneDrawing {
  id: number
  character: number
  character_name: string
  player_name: string
  template: number | null
  template_name: string | null
  template_reference_image: string | null
  image_data: string
  title: string
  notes: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  mj_feedback: string
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
  campaign: number
}

export interface RuneCollectionItem {
  id: number
  character: number
  rune_drawing: number
  drawing_title: string
  drawing_image: string
  template_name: string | null
  template_effect: string | null
  template_category: string | null
  acquired_at_session: number
  uses_remaining: number | null
}

export const DIFFICULTY_BADGE: Record<string, string> = {
  'apprenti': 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  'adepte': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'maître': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'archimage': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  'apprenti': 'Apprenti',
  'adepte': 'Adepte',
  'maître': 'Maître',
  'archimage': 'Archimage',
}

export const CATEGORY_LABEL: Record<string, string> = {
  'protection': 'Protection',
  'attaque': 'Attaque',
  'soin': 'Soin',
  'utilité': 'Utilité',
  'invocation': 'Invocation',
}

export const CATEGORY_ICON: Record<string, string> = {
  'protection': '🛡️',
  'attaque': '⚔️',
  'soin': '💚',
  'utilité': '🔧',
  'invocation': '✨',
}

export const STATUS_BADGE: Record<string, string> = {
  'draft': 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  'submitted': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'approved': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

export const STATUS_LABEL: Record<string, string> = {
  'draft': 'Brouillon',
  'submitted': 'Soumis',
  'approved': 'Approuvé',
  'rejected': 'Rejeté',
}

export const DIFFICULTIES = ['apprenti', 'adepte', 'maître', 'archimage'] as const
export const CATEGORIES = ['protection', 'attaque', 'soin', 'utilité', 'invocation'] as const

export interface Stroke {
  points: { x: number; y: number }[]
  color: string
  size: number
  tool: 'brush' | 'eraser'
}
