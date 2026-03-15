import React from 'react'

interface StatsEditorProps {
  stats: Record<string, number | string>
  editable: boolean
  onChange: (stats: Record<string, number | string>) => void
}

export default function StatsEditor({ stats, editable, onChange }: StatsEditorProps) {
  const [newKey, setNewKey] = React.useState('')
  const [newValue, setNewValue] = React.useState('')

  const entries = Object.entries(stats)

  const handleUpdate = (key: string, value: string) => {
    const numVal = Number(value)
    onChange({ ...stats, [key]: isNaN(numVal) || value === '' ? value : numVal })
  }

  const handleRemove = (key: string) => {
    const next = { ...stats }
    delete next[key]
    onChange(next)
  }

  const handleAdd = () => {
    if (!newKey.trim()) return
    const numVal = Number(newValue)
    onChange({ ...stats, [newKey.trim()]: isNaN(numVal) || newValue === '' ? newValue : numVal })
    setNewKey('')
    setNewValue('')
  }

  if (entries.length === 0 && !editable) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucune statistique.</p>
  }

  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-1.5 pr-3 font-medium text-gray-600 dark:text-gray-400">Stat</th>
            <th className="text-left py-1.5 pr-3 font-medium text-gray-600 dark:text-gray-400">Valeur</th>
            {editable && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-1.5 pr-3 text-gray-900 dark:text-gray-100">{key}</td>
              <td className="py-1.5 pr-3">
                {editable ? (
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(e) => handleUpdate(key, e.target.value)}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <span className="text-gray-900 dark:text-gray-100">{String(value)}</span>
                )}
              </td>
              {editable && (
                <td className="py-1.5">
                  <button
                    onClick={() => handleRemove(key)}
                    className="text-red-400 hover:text-red-600 text-xs"
                    title="Supprimer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editable && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="Nom"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            placeholder="Valeur"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleAdd}
            className="btn btn-primary text-xs py-1 px-2"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
