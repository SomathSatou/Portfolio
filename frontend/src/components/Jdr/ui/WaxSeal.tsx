import { Settings, type LucideIcon } from 'lucide-react'

interface WaxSealProps {
  icon?: LucideIcon
  label?: string
  tone?: 'wine' | 'gold' | 'forest' | 'arcane'
  position?: 'bottom-right' | 'top-right'
}

export default function WaxSeal({
  icon: Icon = Settings,
  label,
  tone = 'wine',
  position = 'bottom-right',
}: WaxSealProps) {
  return (
    <div className={`wax-seal wax-seal-${tone} wax-seal-${position}`} aria-label={label} role={label ? 'img' : undefined}>
      <span className="wax-seal-ribbon" aria-hidden="true" />
      <span className="wax-seal-mark" aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></span>
    </div>
  )
}
