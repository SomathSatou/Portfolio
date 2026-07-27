import axios from 'axios'
import React from 'react'
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
      const res = await axios.get<MuscuUser>('/api/auth/me/', { headers: { Authorization: `Bearer ${localStorage.getItem('auth_access')}` } })
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
    async (data: Partial<Pick<MuscuUser, 'username' | 'email'>>) => {
      const res = await axios.patch<MuscuUser>('/api/auth/me/', data, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_access')}` } })
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
      ? await axios.post<MuscuUser>('/api/auth/me/avatar/', formData, { headers })
      : await axios.delete<MuscuUser>('/api/auth/me/avatar/', { headers })
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

  const logout = React.useCallback(() => {
    localStorage.removeItem('auth_access')
    localStorage.removeItem('auth_refresh')
    setState({ user: null, isAuthenticated: false, isLoading: false })
    window.location.hash = '#/irlrpg'
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
    () => ({ ...state, login, logout, refreshToken, updateProfile, updateAvatar }),
    [state, login, logout, refreshToken, updateProfile, updateAvatar],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
