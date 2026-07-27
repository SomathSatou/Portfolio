import type { ReactNode } from 'react'
import JdrCard from './JdrCard'
import { getSpellTheme } from './cardThemes'

interface SpellCardProps {
  name: string
  school?: string
  level?: number
  manaCost?: number
  description?: ReactNode
  details?: ReactNode
  actions?: ReactNode
  className?: string
}

export default function SpellCard({
  name,
  school,
  level,
  manaCost,
  description,
  details,
  actions,
  className,
}: SpellCardProps) {
  const theme = getSpellTheme(school)
  const Icon = theme.icon

  return (
    <JdrCard variant="spell" className={`${theme.className} ${className ?? ''}`.trim()}>
      <Icon className="jdr-card-watermark" aria-hidden="true" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="jdr-card-icon"><Icon size={18} aria-hidden="true" /></span>
              <h3 className="jdr-card-title truncate">{name}</h3>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {level !== undefined && <span className="jdr-themed-badge">Niv. {level}</span>}
              {school && <span className="jdr-themed-badge">{school}</span>}
              {manaCost !== undefined && manaCost > 0 && <span className="jdr-themed-badge">Mana : {manaCost}</span>}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
        {description && <div className="jdr-card-description mt-3">{description}</div>}
        {details && <div className="jdr-card-details mt-3">{details}</div>}
      </div>
    </JdrCard>
  )
}
