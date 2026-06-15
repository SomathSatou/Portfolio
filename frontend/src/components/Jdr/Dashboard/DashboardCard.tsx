import React from 'react'

interface DashboardCardProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  href?: string
  action?: React.ReactNode
}

export default function DashboardCard({ title, icon, children, href, action }: DashboardCardProps) {
  const content = (
    <div className="card-parchment flex flex-col gap-3 h-full flex-1 animate-slideUp">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: '#c9a227' }}>{icon}</span>
          <h3 className="title-medieval text-base">{title}</h3>
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )

  if (href) {
    return (
      <a href={href} className="no-underline block h-full">
        {content}
      </a>
    )
  }

  return content
}
