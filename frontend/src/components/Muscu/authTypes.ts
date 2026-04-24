import React from 'react'

export interface MuscuUser {
  id: number
  username: string
  email: string
  is_staff: boolean
  can_access_muscu: boolean
  avatar: string | null
}

export interface AuthState {
  user: MuscuUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

export const AuthContext = React.createContext<AuthContextValue | null>(null)
