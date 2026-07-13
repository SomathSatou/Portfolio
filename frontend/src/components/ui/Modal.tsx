import React from 'react'

export type ModalVariant = 'default' | 'glass' | 'parchment' | 'neon'

const panelClass: Record<ModalVariant, string> = {
  default: 'card',
  glass: 'card-glass',
  parchment: 'card-parchment',
  neon: 'card-neon',
}

type ModalProps = {
  open: boolean
  onClose: () => void
  variant?: ModalVariant
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
  maxWidth?: string
}

export default function Modal({ open, onClose, variant = 'default', title, children, className = '', maxWidth = 'max-w-lg' }: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-scaleIn ${panelClass[variant]} ${className}`.trim()}>
        {title !== undefined && (
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
        )}
        {children}
      </div>
    </div>
  )
}
