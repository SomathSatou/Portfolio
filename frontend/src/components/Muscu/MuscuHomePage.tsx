export default function MuscuHomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden theme-irlrpg">
      {/* Scan-line overlay */}
      <div className="absolute inset-0 pointer-events-none scanline-overlay" />

      {/* Glow spots en fond */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none glow-spot-blue" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none glow-spot-lime" />

      <div className="text-center max-w-lg z-10">
        {/* Badge version */}
        <div className="inline-block badge-neon mb-6 neon-badge-lime">
          v1.0 — BETA ACCESS
        </div>

        <h1 className="title-neon text-5xl md:text-6xl mb-3" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)' }}>
          IRL RPG
        </h1>
        <p className="neon-label-lime mb-2">
          TRAINING OPERATING SYSTEM
        </p>

        {/* Séparateur néon */}
        <div className="my-6 h-px neon-divider" />

        <p className="mb-8 leading-relaxed neon-description">
          Suivi d'entraînement gamifié. Gagnez de l'XP, montez en niveau, débloquez des rangs.
          Transformez chaque séance en quête épique.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <a href="#/irlrpg/login" className="btn-neon-lime">
            CONNEXION
          </a>
        </div>

        {/* Stats déco */}
        <div className="mt-10 grid grid-cols-3 gap-4">
          {[
            { label: 'RANGS', value: '7' },
            { label: 'MUSCLES', value: '20+' },
            { label: 'XP MAX', value: '∞' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold neon-stat-value">{s.value}</div>
              <div className="text-xs mt-1 neon-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs neon-label">
          <a href="#/" className="neon-link-muted hover:text-slate-400 transition-colors">← PORTFOLIO</a>
        </p>
      </div>
    </div>
  )
}
