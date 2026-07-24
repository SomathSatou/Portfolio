import { useState, useCallback } from 'react'
import type { RuneAnnotations } from './types'

export function useAnnotationsEditor(initial: RuneAnnotations = {}) {
  const [annotations, setAnnotations] = useState<RuneAnnotations>(initial)

  const addCircle = useCallback((x: number, y: number, r: number, text?: string, color = '#ef4444') => {
    setAnnotations((prev) => ({
      ...prev,
      circles: [...(prev.circles ?? []), { x, y, r, color, text }],
    }))
  }, [])

  const addText = useCallback((x: number, y: number, text: string, color = '#ef4444') => {
    setAnnotations((prev) => ({
      ...prev,
      texts: [...(prev.texts ?? []), { x, y, text, color }],
    }))
  }, [])

  const addArrow = useCallback((x1: number, y1: number, x2: number, y2: number, color = '#ef4444') => {
    setAnnotations((prev) => ({
      ...prev,
      arrows: [...(prev.arrows ?? []), { x1, y1, x2, y2, color }],
    }))
  }, [])

  const clear = useCallback(() => setAnnotations({}), [])

  return { annotations, setAnnotations, addCircle, addText, addArrow, clear }
}
