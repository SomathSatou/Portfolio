import React from 'react'
import type { InputVariant } from './Input'

const variantClass: Record<InputVariant, string> = {
  default: 'input-base',
  parchment: 'input-parchment',
  neon: 'input-neon',
}

type TextAreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  variant?: InputVariant
  label?: string
  className?: string
}

export default function TextArea({ variant = 'default', label, className = '', id, ...rest }: TextAreaProps) {
  const textarea = (
    <textarea id={id} className={`${variantClass[variant]} ${className}`.trim()} {...rest} />
  )
  if (!label) return textarea
  return (
    <label className="block" htmlFor={id}>
      <span className="block text-sm font-medium mb-1">{label}</span>
      {textarea}
    </label>
  )
}
