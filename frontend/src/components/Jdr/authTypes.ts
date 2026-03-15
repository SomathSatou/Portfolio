import React from 'react'

export interface JdrUser {
  id: number
  username: string
  email: string
  role: string
  avatar: string | null
}

export interface AuthState {
  user: JdrUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, passwordConfirm: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

export const AuthContext = React.createContext<AuthContextValue | null>(null)
