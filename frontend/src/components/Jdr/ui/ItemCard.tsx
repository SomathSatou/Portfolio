import type { ReactNode } from 'react'
import JdrCard from './JdrCard'
import { getItemTheme } from './cardThemes'

interface ItemCardProps {
  name: string
  itemType?: string
  rarity?: string
  magical?: boolean
  quantity?: number
  description?: ReactNode
  details?: ReactNode
  actions?: ReactNode
  className?: string
}

export default function ItemCard({
  name,
  itemType,
  rarity,
  magical = false,
  quantity,
  description,
  details,
  actions,
  className,
}: ItemCardProps) {
  const theme = getItemTheme(itemType)
  const Icon = theme.icon

  return (
    <JdrCard variant="item" className={`${theme.className} ${className ?? ''}`.trim()}>
      <Icon className="jdr-card-watermark" aria-hidden="true" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="jdr-card-icon"><Icon size={18} aria-hidden="true" /></span>
              <h3 className="jdr-card-title truncate">
                {name}
                {quantity !== undefined && quantity > 1 && <span className="jdr-card-quantity"> ×{quantity}</span>}
              </h3>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rarity && <span className="jdr-rarity-badge">{rarity}</span>}
              {itemType && <span className="jdr-themed-badge">{itemType}</span>}
              {magical && <span className="jdr-magic-badge">✦ Magique</span>}
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
