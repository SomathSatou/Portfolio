import React from 'react'
import api from './api'
import type { AuthContextValue, AuthState, MuscuUser } from './authTypes'
import { AuthContext } from './authTypes'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const fetchMe = React.useCallback(async () => {
    try {
      const res = await api.get<MuscuUser>('/auth/me/')
      setState({ user: res.data, isAuthenticated: true, isLoading: false })
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  React.useEffect(() => {
    const token = localStorage.getItem('muscu_access')
    if (token) {
      void fetchMe()
    } else {
      setState((s) => ({ ...s, isLoading: false }))
    }
  }, [fetchMe])

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access: string; refresh: string }>('/auth/login/', {
      email,
      password,
    })
    localStorage.setItem('muscu_access', res.data.access)
    localStorage.setItem('muscu_refresh', res.data.refresh)
    await fetchMe()
  }, [fetchMe])

  const logout = React.useCallback(() => {
    localStorage.removeItem('muscu_access')
    localStorage.removeItem('muscu_refresh')
    setState({ user: null, isAuthenticated: false, isLoading: false })
    window.location.hash = '#/irlrpg'
  }, [])

  const refreshToken = React.useCallback(async () => {
    const refresh = localStorage.getItem('muscu_refresh')
    if (!refresh) return
    try {
      const res = await api.post<{ access: string }>('/auth/refresh/', { refresh })
      localStorage.setItem('muscu_access', res.data.access)
    } catch {
      logout()
    }
  }, [logout])

  const value = React.useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, refreshToken }),
    [state, login, logout, refreshToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
