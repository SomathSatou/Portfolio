import React from 'react'
import api from '../api'

interface Gym {
  id: number
  name: string
  address: string
  city: string
}

interface Machine {
  id: number
  name: string
  gym: number
  description: string
}

interface Membership {
  id: number
  gym: number
  gym_name: string
  joined_at: string
}

export default function GymsPage() {
  const [gyms, setGyms] = React.useState<Gym[]>([])
  const [memberships, setMemberships] = React.useState<Membership[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // Detail panel
  const [selectedGym, setSelectedGym] = React.useState<Gym | null>(null)
  const [gymMachines, setGymMachines] = React.useState<Machine[]>([])
  const [loadingMachines, setLoadingMachines] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    try {
      const [gymsRes, membRes] = await Promise.all([
        api.get<Gym[]>('/gyms/'),
        api.get<Membership[]>('/my-gyms/'),
      ])
      setGyms(Array.isArray(gymsRes.data) ? gymsRes.data : [])
      setMemberships(Array.isArray(membRes.data) ? membRes.data : [])
    } catch {
      setError('Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void fetchData() }, [fetchData])

  function isMember(gymId: number): boolean {
    return memberships.some((m) => m.gym === gymId)
  }

  function getMembershipId(gymId: number): number | null {
    const m = memberships.find((mb) => mb.gym === gymId)
    return m ? m.id : null
  }

  async function joinGym(gymId: number) {
    setError('')
    try {
      await api.post('/my-gyms/', { gym: gymId })
      const res = await api.get<Membership[]>('/my-gyms/')
      setMemberships(res.data)
    } catch {
      setError("Erreur lors de l\u2019adh\u00e9sion.")
    }
  }

  async function leaveGym(gymId: number) {
    const membershipId = getMembershipId(gymId)
    if (!membershipId) return
    setError('')
    try {
      await api.delete(`/my-gyms/${membershipId}/`)
      setMemberships((prev) => prev.filter((m) => m.id !== membershipId))
    } catch {
      setError('Erreur lors du d\u00e9sabonnement.')
    }
  }

  async function viewGymDetail(gym: Gym) {
    setSelectedGym(gym)
    setLoadingMachines(true)
    try {
      const res = await api.get<Machine[]>(`/gyms/${gym.id}/machines/`)
      setGymMachines(Array.isArray(res.data) ? res.data : [])
    } catch {
      setGymMachines([])
    } finally {
      setLoadingMachines(false)
    }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Chargement\u2026</p>

  // Gym detail view
  if (selectedGym) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => setSelectedGym(null)}
          className="text-sm text-primary dark:text-primaryLight hover:underline"
        >
          \u2190 Retour aux salles
        </button>

        <div className="card">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">{selectedGym.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedGym.city}</p>
              {selectedGym.address && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedGym.address}</p>
              )}
            </div>
            {isMember(selectedGym.id) ? (
              <button
                onClick={() => leaveGym(selectedGym.id)}
                className="btn btn-outline text-sm text-red-500 border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20"
              >
                Se d\u00e9sabonner
              </button>
            ) : (
              <button
                onClick={() => joinGym(selectedGym.id)}
                className="btn btn-primary text-sm"
              >
                S\u2019abonner
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="card">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Machines ({gymMachines.length})
          </h2>
          {loadingMachines && <p className="text-sm text-gray-500 dark:text-gray-400">Chargement\u2026</p>}
          {!loadingMachines && gymMachines.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune machine enregistr\u00e9e.</p>
          )}
          {!loadingMachines && gymMachines.length > 0 && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {gymMachines.map((m) => (
                <div key={m.id} className="py-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.name}</p>
                  {m.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Gym list view
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">Salles</h1>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* My memberships */}
      {memberships.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Mes salles</h2>
          <div className="flex flex-wrap gap-2">
            {memberships.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary dark:bg-primaryLight/10 dark:text-primaryLight text-sm font-medium">
                {m.gym_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* All gyms */}
      <div className="space-y-3">
        {gyms.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            Aucune salle disponible.
          </p>
        )}
        {gyms.map((g) => (
          <div key={g.id} className="card">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => viewGymDetail(g)}
              >
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 hover:text-primary dark:hover:text-primaryLight transition-colors">
                  {g.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{g.city}</p>
                {g.address && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{g.address}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => viewGymDetail(g)}
                  className="btn btn-outline text-xs"
                >
                  D\u00e9tails
                </button>
                {isMember(g.id) ? (
                  <button
                    onClick={() => leaveGym(g.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Quitter
                  </button>
                ) : (
                  <button
                    onClick={() => joinGym(g.id)}
                    className="btn btn-primary text-xs"
                  >
                    Rejoindre
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
