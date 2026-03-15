import { useAuth } from './useAuth'

export default function JdrHomePage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    window.location.hash = '#/jdr/dashboard'
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold text-primary dark:text-primaryLight mb-4">
          Le Monde de Lug
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Plateforme de gestion pour le jeu de rôles. Connectez-vous pour accéder à vos campagnes, personnages et outils.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="#/jdr/login" className="btn btn-primary">
            Se connecter
          </a>
          <a href="#/jdr/register" className="btn btn-outline">
            Créer un compte
          </a>
        </div>
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
          <a href="#/">← Retour au portfolio</a>
        </p>
      </div>
    </div>
  )
}
