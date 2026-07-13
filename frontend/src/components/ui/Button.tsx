import React from 'react'

export type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'accent'
  | 'medieval'
  | 'medieval-outline'
  | 'neon'
  | 'neon-lime'

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  outline: 'btn btn-outline',
  accent: 'btn btn-accent',
  medieval: 'btn-medieval',
  'medieval-outline': 'btn-medieval-outline',
  neon: 'btn-neon',
  'neon-lime': 'btn-neon-lime',
}

type ButtonProps = {
  variant?: ButtonVariant
  className?: string
  children: React.ReactNode
  href?: string
  target?: string
  rel?: string
  download?: boolean
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  onClick?: React.MouseEventHandler
  title?: string
  'aria-label'?: string
}

export default function Button({
  variant = 'primary',
  className = '',
  children,
  href,
  target,
  rel,
  download,
  type = 'button',
  disabled,
  onClick,
  title,
  'aria-label': ariaLabel,
}: ButtonProps) {
  const classes = `${variantClass[variant]} ${className}`.trim()
  if (href) {
    return (
      <a href={href} target={target} rel={rel} download={download} onClick={onClick} className={classes} title={title} aria-label={ariaLabel}>
        {children}
      </a>
    )
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes} title={title} aria-label={ariaLabel}>
      {children}
    </button>
  )
}
