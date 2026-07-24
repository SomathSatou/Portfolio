import type { PlotMutationLog } from './types.ts'

interface Props {
  logs: PlotMutationLog[]
  loading: boolean
}

export default function GardenMutationLogsView({ logs, loading }: Props) {
  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Chargement des mutations…</p>
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🧬</div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Aucune mutation enregistrée</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Les tentatives de mutation apparaîtront ici après vos récoltes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className={`
            card p-3 flex items-center gap-3 border-l-4
            ${log.success
              ? 'border-l-accent1 bg-accent1/5'
              : 'border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-gray-800/50'
            }
          `}
        >
          <div className="text-2xl">
            {log.success ? log.result_plant_icon ?? '✨' : '🌱'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {log.success
                ? `Mutation réussie : ${log.result_plant_name}`
                : `Aucune mutation sur ${log.harvested_plant_name}`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Session {log.session} — tirage {log.roll_value.toFixed(6)}
            </p>
          </div>
          <span
            className={`
              text-xs font-medium px-2 py-0.5 rounded-full
              ${log.success
                ? 'bg-accent1/30 text-accent2 dark:text-accent1'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }
            `}
          >
            {log.success ? 'Succès' : 'Échec'}
          </span>
        </div>
      ))}
    </div>
  )
}
