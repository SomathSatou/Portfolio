import React from 'react'
import api from './api'
import type { AuthContextValue, AuthState, JdrUser } from './authTypes'
import { AuthContext } from './authTypes'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const fetchMe = React.useCallback(async () => {
    try {
      const res = await api.get<JdrUser>('/auth/me/')
      setState({ user: res.data, isAuthenticated: true, isLoading: false })
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  React.useEffect(() => {
    const token = localStorage.getItem('jdr_access')
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
    localStorage.setItem('jdr_access', res.data.access)
    localStorage.setItem('jdr_refresh', res.data.refresh)
    await fetchMe()
  }, [fetchMe])

  const register = React.useCallback(
    async (username: string, email: string, password: string, passwordConfirm: string) => {
      await api.post('/auth/register/', {
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      })
    },
    [],
  )

  const logout = React.useCallback(() => {
    localStorage.removeItem('jdr_access')
    localStorage.removeItem('jdr_refresh')
    setState({ user: null, isAuthenticated: false, isLoading: false })
    window.location.hash = '#/jdr'
  }, [])

  const refreshToken = React.useCallback(async () => {
    const refresh = localStorage.getItem('jdr_refresh')
    if (!refresh) return
    try {
      const res = await api.post<{ access: string }>('/auth/refresh/', { refresh })
      localStorage.setItem('jdr_access', res.data.access)
    } catch {
      logout()
    }
  }, [logout])

  const value = React.useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, refreshToken }),
    [state, login, register, logout, refreshToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
