import React from 'react'

export type BadgeVariant = 'default' | 'neon'

const variantClass: Record<BadgeVariant, string> = {
  default: 'badge',
  neon: 'badge-neon',
}

type BadgeProps = {
  variant?: BadgeVariant
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export default function Badge({ variant = 'default', className = '', style, children }: BadgeProps) {
  return (
    <span className={`${variantClass[variant]} ${className}`.trim()} style={style}>
      {children}
    </span>
  )
}
