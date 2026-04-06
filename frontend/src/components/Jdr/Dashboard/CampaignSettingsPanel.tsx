import React from 'react'
import api from '../api'
import type { CampaignSettings } from './types'

interface CampaignSettingsPanelProps {
  campaignId: number
  isMJ: boolean
}

export default function CampaignSettingsPanel({ campaignId, isMJ }: CampaignSettingsPanelProps) {
  const [settings, setSettings] = React.useState<CampaignSettings | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [successMsg, setSuccessMsg] = React.useState('')

  // Edit fields
  const [statMin, setStatMin] = React.useState(0)
  const [statMax, setStatMax] = React.useState(20)
  const [basePoints, setBasePoints] = React.useState(10)
  const [pointsPerLevel, setPointsPerLevel] = React.useState(5)

  React.useEffect(() => {
    setLoading(true)
    setError('')
    api
      .get<CampaignSettings>(`/campaigns/${campaignId}/settings/`)
      .then((res) => {
        setSettings(res.data)
        setStatMin(res.data.stat_min)
        setStatMax(res.data.stat_max)
        setBasePoints(res.data.base_points)
        setPointsPerLevel(res.data.points_per_level)
      })
      .catch(() => setError('Impossible de charger les paramètres.'))
      .finally(() => setLoading(false))
  }, [campaignId])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await api.patch<CampaignSettings>(`/campaigns/${campaignId}/settings/`, {
        stat_min: statMin,
        stat_max: statMax,
        base_points: basePoints,
        points_per_level: pointsPerLevel,
      })
      setSettings(res.data)
      setSuccessMsg('Paramètres sauvegardés.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400 py-8 text-center">Chargement…</p>
  }

  if (!settings) {
    return <p className="text-red-500 py-8 text-center">{error || 'Paramètres introuvables.'}</p>
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-primary dark:text-primaryLight mb-4">
        Paramètres de la campagne
      </h2>

      <div className="card p-6 space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ces paramètres définissent les contraintes de répartition des statistiques pour tous les personnages de la campagne.
        </p>

        {/* Stat Min */}
        <div>
          <label htmlFor="stat-min" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Minimum par statistique
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
            Aucune statistique ne peut descendre en dessous de cette valeur.
          </p>
          {isMJ ? (
            <input
              id="stat-min"
              type="number"
              min={0}
              value={statMin}
              onChange={(e) => setStatMin(Math.max(0, Number(e.target.value)))}
              className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          ) : (
            <span className="text-lg font-semibold text-accent3">{settings.stat_min}</span>
          )}
        </div>

        {/* Stat Max */}
        <div>
          <label htmlFor="stat-max" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maximum par statistique
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
            Aucune statistique ne peut dépasser cette valeur.
          </p>
          {isMJ ? (
            <input
              id="stat-max"
              type="number"
              min={statMin}
              value={statMax}
              onChange={(e) => setStatMax(Math.max(statMin, Number(e.target.value)))}
              className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          ) : (
            <span className="text-lg font-semibold text-accent3">{settings.stat_max}</span>
          )}
        </div>

        {/* Base Points */}
        <div>
          <label htmlFor="base-pts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Points de statistique au niveau 1
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
            Nombre de points de départ à répartir pour un personnage de niveau 1.
          </p>
          {isMJ ? (
            <input
              id="base-pts"
              type="number"
              min={0}
              value={basePoints}
              onChange={(e) => setBasePoints(Math.max(0, Number(e.target.value)))}
              className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          ) : (
            <span className="text-lg font-semibold text-accent3">{settings.base_points}</span>
          )}
        </div>

        {/* Points per Level */}
        <div>
          <label htmlFor="pts-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Points gagnés par niveau supplémentaire
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
            À chaque niveau au-delà du 1, le personnage gagne ce nombre de points supplémentaires.
          </p>
          {isMJ ? (
            <input
              id="pts-level"
              type="number"
              min={1}
              value={pointsPerLevel}
              onChange={(e) => setPointsPerLevel(Math.max(1, Number(e.target.value)))}
              className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          ) : (
            <span className="text-lg font-semibold text-accent3">{settings.points_per_level}</span>
          )}
        </div>

        {/* Example summary */}
        <div className="rounded-md bg-primary/5 dark:bg-primary/10 p-3 text-sm text-gray-700 dark:text-gray-300">
          <strong>Résumé :</strong> Chaque stat entre{' '}
          <span className="font-semibold text-primary dark:text-primaryLight">{isMJ ? statMin : settings.stat_min}</span> et{' '}
          <span className="font-semibold text-primary dark:text-primaryLight">{isMJ ? statMax : settings.stat_max}</span>.
          Un personnage niveau 5 disposerait de{' '}
          <span className="font-semibold text-accent3">{(isMJ ? basePoints : settings.base_points) + 4 * (isMJ ? pointsPerLevel : settings.points_per_level)}</span> points à répartir.
        </div>

        {/* Actions */}
        {isMJ && (
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            {successMsg && <span className="text-sm text-green-600">{successMsg}</span>}
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>
        )}

        {!isMJ && error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}
