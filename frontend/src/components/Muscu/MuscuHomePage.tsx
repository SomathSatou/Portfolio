export default function MuscuHomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold text-primary dark:text-primaryLight mb-4">
          IRL RPG
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Suivi d'entraînement musculaire gamifié. Gagnez de l'XP, montez en niveau, débloquez des badges.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="#/irlrpg/login" className="btn btn-primary">
            Se connecter
          </a>
          <a href="#/irlrpg/register" className="btn btn-outline">
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
