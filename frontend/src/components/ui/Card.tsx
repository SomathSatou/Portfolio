import React from 'react'

export type CardVariant = 'default' | 'glass' | 'bento' | 'parchment' | 'neon' | 'neon-lime'

const variantClass: Record<CardVariant, string> = {
  default: 'card',
  glass: 'card-glass',
  bento: 'card-bento',
  parchment: 'card-parchment',
  neon: 'card-neon',
  'neon-lime': 'card-neon-lime',
}

type CardProps = {
  variant?: CardVariant
  className?: string
  children: React.ReactNode
  href?: string
  onClick?: React.MouseEventHandler
}

export default function Card({ variant = 'default', className = '', children, href, onClick }: CardProps) {
  const classes = `${variantClass[variant]} ${className}`.trim()
  if (href) {
    return (
      <a href={href} onClick={onClick} className={`${classes} block no-underline`}>
        {children}
      </a>
    )
  }
  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  )
}
