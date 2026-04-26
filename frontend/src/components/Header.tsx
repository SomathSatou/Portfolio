import React from 'react'

export default function Header() {
  const [dark, setDark] = React.useState<boolean>(document.documentElement.classList.contains('dark'))
  const [menuOpen, setMenuOpen] = React.useState(false)

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
