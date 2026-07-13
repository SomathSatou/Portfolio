import BurgerIcon from './BurgerIcon'
import { navLinks, useHeaderState } from './useHeaderState'

export default function JdrHeader() {
  const { dark, toggleTheme, menuOpen, setMenuOpen } = useHeaderState()

  return (
    <header className="header-jdr sticky top-0 z-50">
      <div className="header-container">
        <a href="#/" className="header-jdr-brand">
          Thomas Saout
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="header-jdr-link">
              {link.label}
            </a>
          ))}
          <button type="button" onClick={toggleTheme} className="header-jdr-toggle">
            {dark ? 'Jour' : 'Nuit'}
          </button>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <button type="button" onClick={toggleTheme} className="header-jdr-toggle !px-2">
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded text-amber-200 hover:bg-amber-700/30 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <BurgerIcon open={menuOpen} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="md:hidden animate-slideUp header-jdr-mobile-menu">
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
