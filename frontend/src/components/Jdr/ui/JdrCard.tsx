import type { ComponentPropsWithoutRef } from 'react'

type JdrCardVariant = 'base' | 'spell' | 'item' | 'compact'

interface JdrCardProps extends ComponentPropsWithoutRef<'div'> {
  variant?: JdrCardVariant
}

export default function JdrCard({ variant = 'base', className = '', ...props }: JdrCardProps) {
  return <div className={`card jdr-card jdr-card-${variant} ${className}`.trim()} {...props} />
}
