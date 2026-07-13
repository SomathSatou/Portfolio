type SkeletonProps = {
  className?: string
}

export default function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />
}
