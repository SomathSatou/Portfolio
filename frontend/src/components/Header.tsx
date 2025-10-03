import React from 'react'

export default function Header() {
  const [dark, setDark] = React.useState<boolean>(document.documentElement.classList.contains('dark'))

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

  return (
    <header className="sticky top-0 z-50 bg-primary text-white shadow">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <a href="#/" className="font-semibold tracking-wide">Thomas Saout</a>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#/cv" className="hover:text-accent3 transition-colors">CV</a>
          <a href="#/projects" className="hover:text-accent3 transition-colors">Projets</a>
          <a href="#/contact" className="hover:text-accent3 transition-colors">Contact</a>
          {/* TODO: Add language switch FR/EN with i18n */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium tracking-wide"
            aria-label="Basculer le thème"
            title="Basculer le thème"
          >
            {dark ? 'Mode clair' : 'Mode sombre'}
          </button>
        </nav>
      </div>
    </header>
  )
}
