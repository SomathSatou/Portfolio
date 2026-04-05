const DICE_REGEX = /^(\d{1,3})d(\d{1,4})$/i

export function isDiceCommand(text: string): boolean {
  return DICE_REGEX.test(text.trim())
}

export function formatDiceResult(result: { command: string; rolls: number[]; total: number }): string {
  const rollsStr = result.rolls.join(' + ')
  if (result.rolls.length === 1) {
    return `🎲 ${result.command} → ${result.total}`
  }
  return `🎲 ${result.command} → [${rollsStr}] = ${result.total}`
}

export function formatCurrency(gold: number, silver: number, copper: number): string {
  const parts: string[] = []
  if (gold > 0) parts.push(`${gold} po`)
  if (silver > 0) parts.push(`${silver} pa`)
  if (copper > 0) parts.push(`${copper} pc`)
  return parts.length > 0 ? parts.join(', ') : '0 pc'
}
