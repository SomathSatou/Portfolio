import React from 'react'
import { DICE_INLINE_REGEX } from './diceUtils'

interface Props {
  text: string
  onRoll?: (diceCommand: string) => void
}

/**
 * Renders text with inline dice patterns (e.g. "1d20+5", "3d6-2")
 * converted to clickable buttons that trigger a dice roll.
 */
export default function DiceText({ text, onRoll }: Props) {
  const parts = React.useMemo(() => {
    if (!onRoll) return [{ type: 'text' as const, value: text }]

    const result: { type: 'text' | 'dice'; value: string }[] = []
    let lastIndex = 0

    // Reset regex state
    DICE_INLINE_REGEX.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = DICE_INLINE_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', value: text.slice(lastIndex, match.index) })
      }
      result.push({ type: 'dice', value: match[1] })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      result.push({ type: 'text', value: text.slice(lastIndex) })
    }

    return result.length > 0 ? result : [{ type: 'text' as const, value: text }]
  }, [text, onRoll])

  return (
    <span>
      {parts.map((part, i) =>
        part.type === 'dice' ? (
          <button
            key={i}
            onClick={() => onRoll?.(part.value)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-accent3/20 hover:bg-accent3/40 text-yellow-800 dark:text-accent3 font-mono text-xs font-semibold cursor-pointer transition-colors border border-accent3/30"
            title={`Lancer ${part.value}`}
          >
            🎲 {part.value}
          </button>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </span>
  )
}
