import React from 'react'

export type DrawerVariant = 'default' | 'parchment' | 'neon'

const panelStyle: Record<DrawerVariant, React.CSSProperties> = {
  default: {},
  parchment: { background: 'var(--parchment-panel-bg)', borderLeft: '1px solid rgba(201, 162, 39, 0.4)' },
  neon: { background: 'var(--color-irlrpg-bg)', borderLeft: '1px solid rgba(14, 165, 233, 0.35)' },
}

type DrawerProps = {
  open: boolean
  onClose: () => void
  variant?: DrawerVariant
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
  width?: string
}

export default function Drawer({ open, onClose, variant = 'default', title, children, className = '', width = 'max-w-md' }: DrawerProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 animate-fadeIn" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`absolute inset-y-0 right-0 w-full ${width} overflow-y-auto p-5 animate-slideInRight bg-white dark:bg-gray-900 shadow-2xl ${className}`.trim()}
        style={panelStyle[variant]}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-0 text-current"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
