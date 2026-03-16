interface Props {
  sessionsGrown: number
  growthTime: number
}

export default function GrowthProgressBar({ sessionsGrown, growthTime }: Props) {
  const pct = Math.min((sessionsGrown / growthTime) * 100, 100)

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>{sessionsGrown}/{growthTime} sessions</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-accent1"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
