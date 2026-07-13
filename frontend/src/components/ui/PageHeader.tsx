import React from 'react'

export type PageHeaderVariant = 'default' | 'medieval' | 'neon'

const titleClass: Record<PageHeaderVariant, string> = {
  default: 'text-2xl font-bold text-primary',
  medieval: 'title-medieval text-2xl',
  neon: 'title-neon text-2xl',
}

const subtitleClass: Record<PageHeaderVariant, string> = {
  default: 'mt-1 text-sm text-gray-500 dark:text-gray-400',
  medieval: 'mt-1 text-sm ink-muted',
  neon: 'mt-1 text-sm',
}

type PageHeaderProps = {
  variant?: PageHeaderVariant
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export default function PageHeader({ variant = 'default', title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 mb-6 animate-fadeIn ${className}`.trim()}>
      <div>
        <h1 className={titleClass[variant]}>{title}</h1>
        {subtitle && (
          <p className={subtitleClass[variant]} style={variant === 'neon' ? { color: 'var(--color-irlrpg-muted)' } : undefined}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
