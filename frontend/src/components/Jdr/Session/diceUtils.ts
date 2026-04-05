const DICE_REGEX = /^(\d{1,3})d(\d{1,4})([+-]\d{1,6})?$/i

// Regex to find dice patterns inside arbitrary text (non-anchored)
export const DICE_INLINE_REGEX = /\b(\d{1,3}d\d{1,4}(?:[+-]\d{1,6})?)\b/gi

export function isDiceCommand(text: string): boolean {
  return DICE_REGEX.test(text.trim())
}

export function formatDiceResult(result: { command: string; rolls: number[]; modifier?: number; total: number }): string {
  const rollsStr = result.rolls.join(' + ')
  const mod = result.modifier
  const modStr = mod ? (mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`) : ''
  if (result.rolls.length === 1 && !mod) {
    return `🎲 ${result.command} → ${result.total}`
  }
  return `🎲 ${result.command} → [${rollsStr}]${modStr} = ${result.total}`
}

export function formatCurrency(gold: number, silver: number, copper: number): string {
  const parts: string[] = []
  if (gold > 0) parts.push(`${gold} po`)
  if (silver > 0) parts.push(`${silver} pa`)
  if (copper > 0) parts.push(`${copper} pc`)
  return parts.length > 0 ? parts.join(', ') : '0 pc'
}
