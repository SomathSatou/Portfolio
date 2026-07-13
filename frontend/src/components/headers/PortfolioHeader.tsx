import BurgerIcon from './BurgerIcon'
import { navLinks, useHeaderState } from './useHeaderState'

export default function PortfolioHeader() {
  const { dark, toggleTheme, menuOpen, setMenuOpen } = useHeaderState()

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
            <BurgerIcon open={menuOpen} />
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
