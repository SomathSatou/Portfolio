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
    <header className="header">
      <div className="header-container">
        <a href="#/" className="header-brand">Thomas Saout</a>
        <nav className="header-nav">
          <a href="#/cv">CV</a>
          <a href="#/projects">Projets</a>
          <a href="#/courses">Cours</a>
          <a href="#/hobbies">Loisirs</a>
          <a href="#/contact">Contact</a>
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
      </div>
    </header>
  )
}
