import { useAuth } from './useAuth'

export default function JdrHomePage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center parchment-bg">
        <p className="loading-text-jdr">Consultation des parchemins…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    window.location.hash = '#/jdr/dashboard'
    return (
      <div className="min-h-screen flex flex-col items-center justify-center parchment-bg">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4" />
        <p className="loading-text-jdr">Ouverture du livre de campagne…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center parchment-bg px-4 relative overflow-hidden">
      {/* Décoration coins */}
      <div className="absolute top-8 left-8 w-16 h-16 opacity-20 corner-tl-jdr" />
      <div className="absolute top-8 right-8 w-16 h-16 opacity-20 corner-tr-jdr" />
      <div className="absolute bottom-8 left-8 w-16 h-16 opacity-20 corner-bl-jdr" />
      <div className="absolute bottom-8 right-8 w-16 h-16 opacity-20 corner-br-jdr" />

      <div className="text-center max-w-xl z-10">
        {/* Ornement au-dessus du titre */}
        <div className="divider-medieval mb-6">
          <span>✦ ✦ ✦</span>
        </div>

        <h1 className="title-medieval text-4xl md:text-5xl mb-2">
          Le Monde de Lug
        </h1>
        <p className="mb-6 subtitle-jdr">
          Livre de Campagne — Plateforme des Aventuriers
        </p>

        <div className="divider-medieval mb-8">
          <span>~ ~ ~</span>
        </div>

        <p className="mb-8 leading-relaxed description-jdr">
          Accédez à vos campagnes, gérez vos personnages, parcourez le comptoir des marchands et dessinez vos runes. L'aventure vous attend.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <a href="#/jdr/login" className="btn-medieval">
            Se connecter
          </a>
          <a href="#/jdr/register" className="btn-medieval-outline">
            Créer un compte
          </a>
        </div>

        <p className="mt-8 text-sm back-link-text-jdr">
          <a href="#/" className="no-underline hover:underline back-link-jdr">← Retour au portfolio</a>
        </p>
      </div>
    </div>
  )
}
