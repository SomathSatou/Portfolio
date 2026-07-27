import axios from 'axios'
import React from 'react'
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
      const res = await axios.get<JdrUser>('/api/auth/me/', { headers: { Authorization: `Bearer ${localStorage.getItem('auth_access')}` } })
      setState({ user: res.data, isAuthenticated: true, isLoading: false })
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  React.useEffect(() => {
    const token = localStorage.getItem('auth_access')
    if (token) {
      void fetchMe()
    } else {
      setState((s) => ({ ...s, isLoading: false }))
    }
  }, [fetchMe])

  const updateProfile = React.useCallback(
    async (data: Partial<Pick<JdrUser, 'username' | 'email'>>) => {
      const res = await axios.patch<JdrUser>('/api/auth/me/', data, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_access')}` } })
      setState((s) => ({ ...s, user: res.data }))
      return res.data
    },
    [],
  )

  const updateAvatar = React.useCallback(async (avatar: File | null) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('auth_access')}` }
    const formData = new FormData()
    if (avatar) formData.append('avatar', avatar)
    const res = avatar
      ? await axios.post<JdrUser>('/api/auth/me/avatar/', formData, { headers })
      : await axios.delete<JdrUser>('/api/auth/me/avatar/', { headers })
    setState((s) => ({ ...s, user: res.data }))
    return res.data
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await axios.post<{ access: string; refresh: string }>('/api/auth/login/', {
      email,
      password,
    })
    localStorage.setItem('auth_access', res.data.access)
    localStorage.setItem('auth_refresh', res.data.refresh)
    await fetchMe()
  }, [fetchMe])

  const register = React.useCallback(
    async (username: string, email: string, password: string, passwordConfirm: string) => {
      await axios.post('/api/auth/register/', {
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      })
    },
    [],
  )

  const logout = React.useCallback(() => {
    localStorage.removeItem('auth_access')
    localStorage.removeItem('auth_refresh')
    setState({ user: null, isAuthenticated: false, isLoading: false })
    window.location.hash = '#/jdr'
  }, [])

  const refreshToken = React.useCallback(async () => {
    const refresh = localStorage.getItem('auth_refresh')
    if (!refresh) return
    try {
      const res = await axios.post<{ access: string }>('/api/auth/refresh/', { refresh })
      localStorage.setItem('auth_access', res.data.access)
    } catch {
      logout()
    }
  }, [logout])

  const value = React.useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, refreshToken, updateProfile, updateAvatar }),
    [state, login, register, logout, refreshToken, updateProfile, updateAvatar],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
