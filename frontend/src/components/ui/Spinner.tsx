type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClass = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={`inline-block rounded-full border-current border-t-transparent animate-spin ${sizeClass[size]} ${className}`.trim()}
      role="status"
      aria-label="Chargement"
    />
  )
}
