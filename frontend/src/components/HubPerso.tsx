const apps = [
  {
    name: 'IRL RPG',
    description: 'Suivi muscu gamifié — séances, XP, badges, classement',
    hash: '#/irlrpg',
    icon: '🏋️',
    color: 'from-irlrpgPrimary/15 to-irlrpgLight/15',
    border: 'border-irlrpgPrimary/30',
    hoverColor: 'group-hover:text-irlrpgPrimary dark:group-hover:text-irlrpgLight',
    linkColor: 'text-irlrpgPrimary dark:text-irlrpgLight',
  },
  {
    name: 'JDR — Le Monde de Lug',
    description: 'Campagnes, fiches perso, marchand, jardin alchimique',
    hash: '#/jdr',
    icon: '🎲',
    color: 'from-jdrPrimary/15 to-jdrLight/15',
    border: 'border-jdrPrimary/30',
    hoverColor: 'group-hover:text-jdrPrimary dark:group-hover:text-jdrLight',
    linkColor: 'text-jdrPrimary dark:text-jdrLight',
  },
]

export default function HubPerso() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Mon Espace</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Accédez à vos applications
            </p>
          </div>
          <a
            href="#/"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 no-underline transition-colors"
          >
            ← Portfolio
          </a>
        </div>
      </header>

      {/* App cards */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {apps.map((app) => (
            <a
              key={app.name}
              href={app.hash}
              className={`group block rounded-xl border ${app.border} bg-gradient-to-br ${app.color} p-6 no-underline transition-all hover:shadow-lg hover:scale-[1.02]`}
            >
              <div className="text-4xl mb-3">{app.icon}</div>
              <h2 className={`text-lg font-bold text-gray-800 dark:text-gray-100 ${app.hoverColor} transition-colors`}>
                {app.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {app.description}
              </p>
              <div className={`mt-4 text-xs font-medium ${app.linkColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Ouvrir →
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
