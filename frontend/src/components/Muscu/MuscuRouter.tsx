import React from 'react'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'
import MuscuHomePage from './MuscuHomePage'
import LoginPage from './LoginPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'
import MuscuLayout from './MuscuLayout'
import DashboardPage from './pages/DashboardPage'
import WorkoutPage from './pages/WorkoutPage'
import HistoryPage from './pages/HistoryPage'
import GoalsPage from './pages/GoalsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import ExercisesPage from './pages/ExercisesPage'
import GymsPage from './pages/GymsPage'

function AuthLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center theme-irlrpg">
      <div className="animate-spin h-10 w-10 border-4 border-[var(--color-irlrpg-primary)] border-t-transparent rounded-full mb-4" />
      <p className="title-neon text-sm">Chargement…</p>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AuthLoader />
  }

  if (!isAuthenticated) {
    window.location.hash = '#/irlrpg/login'
    return <AuthLoader />
  }

  return <MuscuLayout>{children}</MuscuLayout>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AuthLoader />
  }

  if (!isAuthenticated) {
    window.location.hash = '#/irlrpg/login'
    return <AuthLoader />
  }

  if (!user?.is_staff) {
    window.location.hash = '#/irlrpg/dashboard'
    return <AuthLoader />
  }

  return <MuscuLayout>{children}</MuscuLayout>
}

function MuscuRouterInner({ hash }: { hash: string }) {
  // Public routes
  if (hash === '#/irlrpg' || hash === '#/irlrpg/') return <MuscuHomePage />
  if (hash === '#/irlrpg/login') return <LoginPage />
  if (hash === '#/irlrpg/forgot-password') return <ForgotPasswordPage />
  if (hash.startsWith('#/irlrpg/reset-password')) return <ResetPasswordPage />

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

  if (hash === '#/irlrpg/exercises') {
    return (
      <ProtectedRoute>
        <ExercisesPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/irlrpg/gyms') {
    return (
      <ProtectedRoute>
        <GymsPage />
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
