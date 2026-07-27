import { describe, expect, it } from 'vitest'
import { getItemTheme, getSpellTheme } from '../components/Jdr/ui/cardThemes'

describe('JDR card themes', () => {
  it.each([
    ['Psychique', 'psychic'],
    ['NÉCROTIQUE', 'necrotic'],
    ['sort d’eau', 'water'],
    ['Boule de feu', 'fire'],
    ['Électricité', 'lightning'],
    ['Givre', 'ice'],
    ['druidique', 'nature'],
    ['Lumière divine', 'holy'],
    ['Ténèbres', 'shadow'],
  ])('maps %s to the %s spell family', (school, key) => {
    expect(getSpellTheme(school).key).toBe(key)
  })

  it('uses the arcane family for unknown schools', () => {
    expect(getSpellTheme('chronomancie obscure').key).toBe('arcane')
  })

  it.each([
    ['Hache de guerre', 'weapon'],
    ['Casque renforcé', 'armor'],
    ['Anneau ancien', 'accessory'],
    ['Potion de soin', 'consumable'],
    ['Kit d’alchimie', 'tool'],
    ['Minerai brut', 'resource'],
  ])('maps %s to the %s item family', (itemType, key) => {
    expect(getItemTheme(itemType).key).toBe(key)
  })

  it('uses the miscellaneous family for unknown item types', () => {
    expect(getItemTheme('objet insolite').key).toBe('misc')
  })
})
