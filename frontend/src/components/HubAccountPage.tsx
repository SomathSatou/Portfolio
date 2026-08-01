export default function HubAccountPage() {
  const token = localStorage.getItem('auth_access')
  const isAuthenticated = Boolean(token)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Mon compte</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Choisissez l'application pour laquelle vous souhaitez consulter ou modifier votre profil.
        </p>

        <div className="space-y-3">
          <a
            href={isAuthenticated ? '#/jdr/profile' : '#/jdr/login'}
            className="block w-full btn btn-primary no-underline"
          >
            Profil JDR {isAuthenticated ? '(connecté)' : '(connexion)'}
          </a>
          <a
            href={isAuthenticated ? '#/irlrpg/profile' : '#/irlrpg/login'}
            className="block w-full btn btn-primary no-underline"
          >
            Profil IRL RPG {isAuthenticated ? '(connecté)' : '(connexion)'}
          </a>
        </div>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <a href="#/perso" className="text-primary dark:text-primaryLight hover:underline no-underline">
            ← Retour au hub
          </a>
        </p>
      </div>
    </div>
  )
}
