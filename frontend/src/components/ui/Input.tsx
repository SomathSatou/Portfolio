import React from 'react'

export type InputVariant = 'default' | 'parchment' | 'neon'

const variantClass: Record<InputVariant, string> = {
  default: 'input-base',
  parchment: 'input-parchment',
  neon: 'input-neon',
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  variant?: InputVariant
  label?: string
  className?: string
}

export default function Input({ variant = 'default', label, className = '', id, ...rest }: InputProps) {
  const input = (
    <input id={id} className={`${variantClass[variant]} ${className}`.trim()} {...rest} />
  )
  if (!label) return input
  return (
    <label className="block" htmlFor={id}>
      <span className="block text-sm font-medium mb-1">{label}</span>
      {input}
    </label>
  )
}
