import {
  Brain,
  Droplets,
  Flame,
  FlaskConical,
  Gem,
  HardHat,
  Leaf,
  Moon,
  Package,
  Skull,
  Snowflake,
  Sparkles,
  Sun,
  Sword,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export type SpellThemeKey = 'psychic' | 'necrotic' | 'water' | 'fire' | 'lightning' | 'ice' | 'nature' | 'holy' | 'shadow' | 'arcane'
export type ItemThemeKey = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'tool' | 'resource' | 'misc'

export interface CardTheme {
  key: SpellThemeKey | ItemThemeKey
  label: string
  icon: LucideIcon
  className: string
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_/,-]+/g, ' ')
    .trim()
}

function matches(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword))
}

const SPELL_THEMES: Record<SpellThemeKey, CardTheme> = {
  psychic: { key: 'psychic', label: 'Psychique', icon: Brain, className: 'jdr-theme-psychic' },
  necrotic: { key: 'necrotic', label: 'Nécrotique', icon: Skull, className: 'jdr-theme-necrotic' },
  water: { key: 'water', label: 'Eau', icon: Droplets, className: 'jdr-theme-water' },
  fire: { key: 'fire', label: 'Feu', icon: Flame, className: 'jdr-theme-fire' },
  lightning: { key: 'lightning', label: 'Foudre', icon: Zap, className: 'jdr-theme-lightning' },
  ice: { key: 'ice', label: 'Glace', icon: Snowflake, className: 'jdr-theme-ice' },
  nature: { key: 'nature', label: 'Nature', icon: Leaf, className: 'jdr-theme-nature' },
  holy: { key: 'holy', label: 'Sacré', icon: Sun, className: 'jdr-theme-holy' },
  shadow: { key: 'shadow', label: 'Ombre', icon: Moon, className: 'jdr-theme-shadow' },
  arcane: { key: 'arcane', label: 'Arcanique', icon: Sparkles, className: 'jdr-theme-arcane' },
}

const ITEM_THEMES: Record<ItemThemeKey, CardTheme> = {
  weapon: { key: 'weapon', label: 'Arme', icon: Sword, className: 'jdr-theme-weapon' },
  armor: { key: 'armor', label: 'Armure', icon: HardHat, className: 'jdr-theme-armor' },
  accessory: { key: 'accessory', label: 'Accessoire', icon: Gem, className: 'jdr-theme-accessory' },
  consumable: { key: 'consumable', label: 'Consommable', icon: FlaskConical, className: 'jdr-theme-consumable' },
  tool: { key: 'tool', label: 'Outil', icon: Wrench, className: 'jdr-theme-tool' },
  resource: { key: 'resource', label: 'Ressource', icon: Package, className: 'jdr-theme-resource' },
  misc: { key: 'misc', label: 'Divers', icon: Package, className: 'jdr-theme-misc' },
}

export function getSpellTheme(school: string | null | undefined): CardTheme {
  const value = normalize(school)
  if (matches(value, ['psychic', 'psychiqu', 'psion', 'mental', 'esprit', 'mind'])) return SPELL_THEMES.psychic
  if (matches(value, ['necrot', 'mort', 'death', 'nécrose'])) return SPELL_THEMES.necrotic
  if (matches(value, ['lightning', 'electric', 'eclair', 'foudre'])) return SPELL_THEMES.lightning
  if (matches(value, ['glace', 'ice', 'frost', 'givre', 'froid'])) return SPELL_THEMES.ice
  if (matches(value, ['water', 'eau', 'aquatique', 'hydro'])) return SPELL_THEMES.water
  if (matches(value, ['fire', 'feu', 'flamme', 'incend'])) return SPELL_THEMES.fire
  if (matches(value, ['nature', 'poison', 'druid', 'terre', 'earth'])) return SPELL_THEMES.nature
  if (matches(value, ['holy', 'sacred', 'sacre', 'divin', 'lumiere', 'light'])) return SPELL_THEMES.holy
  if (matches(value, ['shadow', 'dark', 'ombre', 'tenebre'])) return SPELL_THEMES.shadow
  return SPELL_THEMES.arcane
}

export function getItemTheme(itemType: string | null | undefined): CardTheme {
  const value = normalize(itemType)
  if (matches(value, ['arme', 'weapon', 'epee', 'hache', 'lance', 'arc', 'dague', 'mace'])) return ITEM_THEMES.weapon
  if (matches(value, ['armure', 'armor', 'casque', 'bouclier', 'plastron'])) return ITEM_THEMES.armor
  if (matches(value, ['anneau', 'ring', 'bijou', 'amulette', 'talisman', 'accessoire'])) return ITEM_THEMES.accessory
  if (matches(value, ['potion', 'elixir', 'nourriture', 'consommable', 'food'])) return ITEM_THEMES.consumable
  if (matches(value, ['outil', 'tool', 'kit', 'instrument'])) return ITEM_THEMES.tool
  if (matches(value, ['ressource', 'materiau', 'composant', 'minerai', 'ingredient'])) return ITEM_THEMES.resource
  return ITEM_THEMES.misc
}
