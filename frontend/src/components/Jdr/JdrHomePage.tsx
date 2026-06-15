import { useAuth } from './useAuth'

export default function JdrHomePage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center parchment-bg">
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>Consultation des parchemins…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    window.location.hash = '#/jdr/dashboard'
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center parchment-bg px-4 relative overflow-hidden">
      {/* Décoration coins */}
      <div className="absolute top-8 left-8 w-16 h-16 opacity-20" style={{ borderTop: '3px solid #c9a227', borderLeft: '3px solid #c9a227' }} />
      <div className="absolute top-8 right-8 w-16 h-16 opacity-20" style={{ borderTop: '3px solid #c9a227', borderRight: '3px solid #c9a227' }} />
      <div className="absolute bottom-8 left-8 w-16 h-16 opacity-20" style={{ borderBottom: '3px solid #c9a227', borderLeft: '3px solid #c9a227' }} />
      <div className="absolute bottom-8 right-8 w-16 h-16 opacity-20" style={{ borderBottom: '3px solid #c9a227', borderRight: '3px solid #c9a227' }} />

      <div className="text-center max-w-xl z-10">
        {/* Ornement au-dessus du titre */}
        <div className="divider-medieval mb-6">
          <span>✦ ✦ ✦</span>
        </div>

        <h1 className="title-medieval text-4xl md:text-5xl mb-2">
          Le Monde de Lug
        </h1>
        <p className="mb-6" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '1.1rem', color: '#7c5a30' }}>
          Livre de Campagne — Plateforme des Aventuriers
        </p>

        <div className="divider-medieval mb-8">
          <span>~ ~ ~</span>
        </div>

        <p className="mb-8 leading-relaxed" style={{ fontFamily: "'IM Fell English', serif", color: '#5c3317', fontSize: '1rem' }}>
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

        <p className="mt-8 text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
          <a href="#/" className="no-underline hover:underline" style={{ color: '#a0845c' }}>← Retour au portfolio</a>
        </p>
      </div>
    </div>
  )
}
