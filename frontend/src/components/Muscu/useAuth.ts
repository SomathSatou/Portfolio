import React from 'react'
import type { AuthContextValue } from './authTypes'
import { AuthContext } from './authTypes'

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within MuscuAuthProvider')
  return ctx
}
