import { useRunes } from './useRunes'
import type { RunesTab } from './RunesContext'

const tabs: { key: RunesTab; label: string; icon: string; mjOnly?: boolean }[] = [
  { key: 'grimoire', label: 'Grimoire', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { key: 'canvas', label: 'Atelier', icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42' },
  { key: 'drawings', label: 'Mes runes', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10' },
  { key: 'collection', label: 'Collection', icon: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' },
  { key: 'review', label: 'Validation', icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3 3 0 01-1.85 3.185 3 3 0 01-3.032 1.972 3 3 0 01-2.681 1.668 3 3 0 01-2.612-1.668 3 3 0 01-3.032-1.972 3 3 0 01-1.85-3.185A3.001 3.001 0 013 12c0-1.268.63-2.39 1.593-3.068a3 3 0 011.85-3.185 3 3 0 013.032-1.972 3 3 0 012.681-1.668 3 3 0 012.612 1.668 3 3 0 013.032 1.972 3 3 0 011.85 3.185A3.001 3.001 0 0121 12z', mjOnly: true },
]

interface RunesSidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export default function RunesSidebar({ mobileOpen, onClose }: RunesSidebarProps) {
  const { activeTab, setActiveTab, isMJ } = useRunes()

  const visibleTabs = tabs.filter((t) => !t.mjOnly || isMJ)

  const handleClick = (key: RunesTab) => {
    setActiveTab(key)
    onClose()
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0 lg:inset-auto lg:shrink-0
          bg-amber-50/90 dark:bg-gray-900/95 border-r border-primary/20 dark:border-primaryLight/20
          flex flex-col
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="px-4 py-5">
          <h2 className="font-serif text-lg font-bold text-primary dark:text-primaryLight">
            Atelier de Runes
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Grimoire, dessin & validation
          </p>
        </div>
        <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleClick(tab.key)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                ${activeTab === tab.key
                  ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primaryLight/10'}
              `}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}
