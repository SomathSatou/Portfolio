import React from 'react'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'
import MuscuHomePage from './MuscuHomePage'
import LoginPage from './LoginPage'
import MuscuLayout from './MuscuLayout'
import DashboardPage from './pages/DashboardPage'
import WorkoutPage from './pages/WorkoutPage'
import HistoryPage from './pages/HistoryPage'
import GoalsPage from './pages/GoalsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    window.location.hash = '#/irlrpg/login'
    return null
  }

  return <MuscuLayout>{children}</MuscuLayout>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    window.location.hash = '#/irlrpg/login'
    return null
  }

  if (!user?.is_staff) {
    window.location.hash = '#/irlrpg/dashboard'
    return null
  }

  return <MuscuLayout>{children}</MuscuLayout>
}

function MuscuRouterInner({ hash }: { hash: string }) {
  // Public routes
  if (hash === '#/irlrpg' || hash === '#/irlrpg/') return <MuscuHomePage />
  if (hash === '#/irlrpg/login') return <LoginPage />

  // Admin routes
  if (hash.startsWith('#/irlrpg/admin')) {
    return (
      <AdminRoute>
        <AdminPage />
      </AdminRoute>
    )
  }

  // Protected routes
  if (hash === '#/irlrpg/dashboard') {
    return (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/irlrpg/workout') {
    return (
      <ProtectedRoute>
        <WorkoutPage />
      </ProtectedRoute>
    )
  }

  const workoutDetailMatch = hash.match(/^#\/irlrpg\/workout\/(\d+)/)
  if (workoutDetailMatch) {
    return (
      <ProtectedRoute>
        <HistoryPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/irlrpg/history') {
    return (
      <ProtectedRoute>
        <HistoryPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/irlrpg/goals') {
    return (
      <ProtectedRoute>
        <GoalsPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/irlrpg/leaderboard') {
    return (
      <ProtectedRoute>
        <LeaderboardPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/irlrpg/profile') {
    return (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    )
  }

  // Fallback
  return <MuscuHomePage />
}

export default function MuscuRouter({ hash }: { hash: string }) {
  return (
    <AuthProvider>
      <MuscuRouterInner hash={hash} />
    </AuthProvider>
  )
}
