import React from 'react'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'
import JdrHomePage from './JdrHomePage'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import JdrLayout from './JdrLayout'
import { CampaignPage, CharacterCreatePage, CharacterSheet, DashboardPage } from './Dashboard'
import { GardenPage } from './Garden'
import { MerchantPage } from './Merchant'
import { RunesPage } from './Runes'
import { FilesPage } from './Files'

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
    window.location.hash = '#/jdr/login'
    return null
  }

  return <JdrLayout>{children}</JdrLayout>
}

function JdrRouterInner({ hash }: { hash: string }) {
  // Public routes
  if (hash === '#/jdr' || hash === '#/jdr/') return <JdrHomePage />
  if (hash === '#/jdr/login') return <LoginPage />
  if (hash === '#/jdr/register') return <RegisterPage />

  // Protected routes
  const campaignMatch = hash.match(/^#\/jdr\/campaign\/(\d+)/)
  if (campaignMatch) {
    return (
      <ProtectedRoute>
        <CampaignPage campaignId={campaignMatch[1]} />
      </ProtectedRoute>
    )
  }

  if (hash === '#/jdr/character/new') {
    return (
      <ProtectedRoute>
        <CharacterCreatePage />
      </ProtectedRoute>
    )
  }

  const characterMatch = hash.match(/^#\/jdr\/character\/(\d+)/)
  if (characterMatch) {
    return (
      <ProtectedRoute>
        <CharacterSheet characterId={characterMatch[1]} />
      </ProtectedRoute>
    )
  }

  if (hash === '#/jdr/dashboard') {
    return (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/jdr/merchant') {
    return (
      <ProtectedRoute>
        <MerchantPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/jdr/garden') {
    return (
      <ProtectedRoute>
        <GardenPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/jdr/runes') {
    return (
      <ProtectedRoute>
        <RunesPage />
      </ProtectedRoute>
    )
  }

  if (hash === '#/jdr/files') {
    return (
      <ProtectedRoute>
        <FilesPage />
      </ProtectedRoute>
    )
  }

  // Fallback: redirect to JDR home
  return <JdrHomePage />
}

export default function JdrRouter({ hash }: { hash: string }) {
  return (
    <AuthProvider>
      <JdrRouterInner hash={hash} />
    </AuthProvider>
  )
}
