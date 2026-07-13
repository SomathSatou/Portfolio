import React from 'react'

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 animate-fadeIn ${className}`.trim()}>
      {icon && <div className="text-4xl mb-3 opacity-70">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm opacity-70 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
