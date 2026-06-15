export default function MuscuHomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden" style={{ background: '#0f172a' }}>
      {/* Scan-line overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(14,165,233,0.025) 2px, rgba(14,165,233,0.025) 4px)' }} />

      {/* Glow spots en fond */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(132,204,22,0.06) 0%, transparent 70%)' }} />

      <div className="text-center max-w-lg z-10">
        {/* Badge version */}
        <div className="inline-block badge-neon mb-6" style={{ color: '#84cc16' }}>
          v1.0 — BETA ACCESS
        </div>

        <h1 className="title-neon text-5xl md:text-6xl mb-3" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)' }}>
          IRL RPG
        </h1>
        <p className="text-sm mb-2" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.2em', color: '#84cc16' }}>
          TRAINING OPERATING SYSTEM
        </p>

        {/* Séparateur néon */}
        <div className="my-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9, transparent)' }} />

        <p className="mb-8 leading-relaxed" style={{ color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
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
              <div className="text-2xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#0ea5e9', textShadow: '0 0 10px rgba(14,165,233,0.4)' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.12em', color: '#334155' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em', color: '#334155' }}>
          <a href="#/" className="no-underline hover:text-slate-400 transition-colors" style={{ color: '#334155' }}>← PORTFOLIO</a>
        </p>
      </div>
    </div>
  )
}
