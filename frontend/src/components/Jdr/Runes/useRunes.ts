import { useContext } from 'react'
import { RunesContext } from './RunesContext'

export function useRunes() {
  const ctx = useContext(RunesContext)
  if (!ctx) {
    throw new Error('useRunes must be used within a RunesProvider')
  }
  return ctx
}
