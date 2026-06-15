import React from 'react'

function getAppTheme(hash: string): 'jdr' | 'irlrpg' | null {
  if (hash.startsWith('#/jdr')) return 'jdr'
  if (hash.startsWith('#/irlrpg')) return 'irlrpg'
  return null
}

export default function Header() {
  const [dark, setDark] = React.useState<boolean>(document.documentElement.classList.contains('dark'))
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [hash, setHash] = React.useState<string>(window.location.hash || '#/')

  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const appTheme = getAppTheme(hash)

  function toggleTheme() {
    const root = document.documentElement
    const next = !dark
    if (next) {
      root.classList.add('dark')
      try { localStorage.setItem('theme', 'dark') } catch { /* ignore storage errors */ }
    } else {
      root.classList.remove('dark')
      try { localStorage.setItem('theme', 'light') } catch { /* ignore storage errors */ }
    }
    setDark(next)
  }

  const navLinks = [
    { href: '#/cv', label: 'CV' },
    { href: '#/projects', label: 'Projets' },
    { href: '#/teaching-research', label: 'Enseignement et Recherche' },
    { href: '#/contact', label: 'Contact' },
  ]

  if (appTheme === 'jdr') {
    return (
      <header className="header-jdr sticky top-0 z-50">
        <div className="header-container">
          <a href="#/" className="font-semibold tracking-wide no-underline text-amber-100 hover:text-amber-300 transition-colors" style={{ fontFamily: "'Cinzel', serif" }}>
            Thomas Saout
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-amber-200 no-underline hover:text-amber-400 transition-colors" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.04em' }}>
                {link.label}
              </a>
            ))}
            <button type="button" onClick={toggleTheme} className="rounded px-3 py-1.5 text-xs font-medium cursor-pointer bg-amber-700/60 text-amber-100 hover:bg-amber-600/70 transition-colors border border-amber-600/40" style={{ fontFamily: "'Cinzel', serif" }}>
              {dark ? 'Jour' : 'Nuit'}
            </button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <button type="button" onClick={toggleTheme} className="rounded px-2 py-1.5 text-xs cursor-pointer bg-amber-700/60 text-amber-100 border border-amber-600/40">
              {dark ? '☀️' : '🌙'}
            </button>
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded text-amber-200 hover:bg-amber-700/30 transition-colors" aria-label="Ouvrir le menu">
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="md:hidden animate-slideUp" style={{ background: 'rgba(26,14,0,0.97)', borderTop: '1px solid rgba(201,162,39,0.2)' }}>
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-amber-200 no-underline hover:bg-amber-800/30 transition-colors" style={{ fontFamily: "'Cinzel', serif", borderBottom: '1px solid rgba(201,162,39,0.1)' }}>
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </header>
    )
  }

  if (appTheme === 'irlrpg') {
    return (
      <header className="header-irlrpg sticky top-0 z-50">
        <div className="header-container">
          <a href="#/" className="font-semibold tracking-widest no-underline transition-colors" style={{ fontFamily: 'Orbitron, sans-serif', color: '#0ea5e9', textShadow: '0 0 10px rgba(14,165,233,0.5)' }}>
            Thomas Saout
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="no-underline transition-colors hover:text-cyan-300" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', letterSpacing: '0.06em', color: '#94a3b8' }}>
                {link.label}
              </a>
            ))}
            <button type="button" onClick={toggleTheme} className="rounded px-3 py-1.5 text-xs font-medium cursor-pointer transition-all border" style={{ fontFamily: 'Orbitron, sans-serif', color: '#0ea5e9', borderColor: 'rgba(14,165,233,0.4)', background: 'rgba(14,165,233,0.08)', letterSpacing: '0.06em' }}>
              {dark ? 'JOUR' : 'NUIT'}
            </button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <button type="button" onClick={toggleTheme} className="rounded px-2 py-1.5 text-xs cursor-pointer border" style={{ color: '#0ea5e9', borderColor: 'rgba(14,165,233,0.4)', background: 'rgba(14,165,233,0.08)' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded transition-colors" style={{ color: '#0ea5e9' }} aria-label="Ouvrir le menu">
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="md:hidden animate-slideUp" style={{ background: '#0f172a', borderTop: '1px solid rgba(14,165,233,0.2)' }}>
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block px-4 py-3 no-underline transition-colors" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', letterSpacing: '0.06em', color: '#94a3b8', borderBottom: '1px solid rgba(14,165,233,0.1)' }}>
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </header>
    )
  }

  return (
    <header className="header">
      <div className="header-container">
        <a href="#/" className="header-brand">Thomas Saout</a>

        {/* Desktop nav */}
        <nav className="header-nav">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
          <button
            type="button"
            onClick={toggleTheme}
            className="header-theme-toggle"
            aria-label="Basculer le thème"
            title="Basculer le thème"
          >
            {dark ? 'Mode clair' : 'Mode sombre'}
          </button>
        </nav>

        {/* Mobile hamburger button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="header-theme-toggle"
            aria-label="Basculer le thème"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-md text-white hover:bg-white/10 transition-colors"
            aria-label="Ouvrir le menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="header-mobile-menu animate-slideUp">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
