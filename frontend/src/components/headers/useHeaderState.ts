import React from 'react'

export const navLinks = [
  { href: '#/cv', label: 'CV' },
  { href: '#/projects', label: 'Projets' },
  { href: '#/teaching-research', label: 'Enseignement et Recherche' },
  { href: '#/contact', label: 'Contact' },
]

export function useHeaderState() {
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

  return { dark, toggleTheme, menuOpen, setMenuOpen }
}
