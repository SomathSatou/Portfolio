export default function MuscuHomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold text-primary dark:text-primaryLight">
          IRL RPG
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Suivi d'entraînement musculaire gamifié. Gagnez de l'XP, montez en niveau, débloquez des badges.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#/irlrpg/login" className="btn btn-primary">
            Se connecter
          </a>
          <a href="#/" className="btn btn-outline">
            ← Portfolio
          </a>
        </div>
      </div>
    </div>
  )
}
