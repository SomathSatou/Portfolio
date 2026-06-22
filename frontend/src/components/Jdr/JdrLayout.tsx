import React from 'react'
import { NotificationBell } from './Dashboard'
import { useAuth } from './useAuth'

const navItems = [
  { label: 'Tableau de bord', hash: '#/jdr/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { label: 'Campagnes', hash: '#/jdr/campaigns', icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z' },
  { label: 'Personnages', hash: '#/jdr/characters', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { label: 'Comptoir', hash: '#/jdr/merchant', icon: 'M12 3v17.25m0 0c1.472 0 2.882.265 4.185.75M12 20.25c-1.472 0-2.882.265-4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z' },
  { label: 'Jardin', hash: '#/jdr/garden', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { label: 'Runes', hash: '#/jdr/runes', icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42' },
  { label: 'Bibliothèque', hash: '#/jdr/files', icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' },
  { label: 'Profil', hash: '#/jdr/profile', icon: 'M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z' },
]

export default function JdrLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const activeHash = window.location.hash

  return (
    <div className="h-screen flex overflow-hidden parchment-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar parchemin */}
      <aside
        className={`
          sidebar-jdr
          fixed inset-y-0 left-0 z-40 w-64
          transform transition-transform duration-200 ease-in-out flex flex-col
          lg:relative lg:translate-x-0 lg:inset-auto lg:shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 shrink-0" style={{ borderBottom: '1px solid rgba(201,162,39,0.35)' }}>
          <a
            href="#/jdr/dashboard"
            className="no-underline flex flex-col leading-none"
          >
            <span className="title-medieval text-base">Le Monde de Lug</span>
            <span className="text-xs" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>Livre de Campagne</span>
          </a>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded transition-colors"
            style={{ color: '#92400e' }}
            aria-label="Fermer le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-3 px-2 space-y-0.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeHash === item.hash
            return (
              <a
                key={item.label}
                href={item.hash}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded no-underline transition-all text-sm"
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.78rem',
                  letterSpacing: '0.03em',
                  color: isActive ? '#7c3a0e' : '#5c3317',
                  background: isActive ? 'rgba(201,162,39,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #c9a227' : '3px solid transparent',
                }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: isActive ? '#c9a227' : '#a0845c' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="shrink-0 px-3 py-4" style={{ borderTop: '1px solid rgba(201,162,39,0.25)' }}>
          <a
            href="#/"
            className="flex items-center gap-2 px-3 py-2 rounded text-xs no-underline transition-colors"
            style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}
          >
            ← Retour au portfolio
          </a>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header parchemin */}
        <header className="z-20 h-16 shrink-0 flex items-center justify-between px-4 lg:px-6" style={{ background: 'rgba(15,10,5,0.97)', borderBottom: '1px solid rgba(201,162,39,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded transition-colors"
              style={{ color: '#c9a227' }}
              aria-label="Ouvrir le menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <a href="#/" className="lg:hidden text-xs no-underline transition-colors" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
              ← Portfolio
            </a>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2 text-sm" style={{ color: '#e8d5a0' }}>
              <span className="hidden sm:inline font-medium" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem' }}>{user?.username}</span>
              <button
                onClick={logout}
                className="btn-medieval-outline text-xs py-1 px-3"
              >
                Sortir
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 parchment-bg">
          {children}
        </main>
      </div>
    </div>
  )
}
