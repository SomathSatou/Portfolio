import { useContext } from 'react'
import { CookieConsentContext } from './CookieConsentContext'

const footerLinks = [
  { href: '#/cv', label: 'CV' },
  { href: '#/projects', label: 'Projets' },
  { href: '#/teaching-research', label: 'Enseignement' },
  { href: '#/contact', label: 'Contact' },
  { href: '#/perso', label: 'Perso' },
]

export default function Footer() {
  const consent = useContext(CookieConsentContext)
  const openPreferences = consent?.openPreferences ?? (() => {})

  return (
    <footer className="border-t border-white/10 dark:border-gray-800" style={{ background: 'rgba(95, 42, 98, 0.08)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-600 dark:text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>© {new Date().getFullYear()} Thomas Saout</span>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          {footerLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-primary dark:hover:text-primaryLight transition-colors no-underline">
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={openPreferences}
            className="hover:text-primary dark:hover:text-primaryLight transition-colors no-underline"
          >
            Cookies
          </button>
          <a
            href="https://github.com/SomathSatou"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary dark:hover:text-primaryLight transition-colors no-underline"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 2.5-.34c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.05 10.05 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
            </svg>
          </a>
        </nav>
        <span className="text-gray-400">FR/EN bientôt • Django + React</span>
      </div>
    </footer>
  )
}
