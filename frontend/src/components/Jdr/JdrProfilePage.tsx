import React from 'react'
import { useAuth } from './useAuth'

interface FieldError {
  username?: string
  email?: string
  non_field?: string
}

export default function JdrProfilePage() {
  const { user, updateProfile } = useAuth()
  const [username, setUsername] = React.useState(user?.username ?? '')
  const [email, setEmail] = React.useState(user?.email ?? '')
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [errors, setErrors] = React.useState<FieldError>({})

  React.useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email)
    }
  }, [user])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setSuccess(false)

    if (!username.trim() || !email.trim()) {
      setErrors({ non_field: 'Veuillez remplir tous les champs.' })
      return
    }

    setLoading(true)
    try {
      await updateProfile({ username: username.trim(), email: email.trim() })
      setSuccess(true)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } }).response?.data
      if (data) {
        const next: FieldError = {}
        if (data.username) next.username = data.username.join(' ')
        if (data.email) next.email = data.email.join(' ')
        if (data.non_field_errors || data.detail) {
          next.non_field = (data.non_field_errors ?? data.detail).join(' ')
        }
        setErrors(next)
      } else {
        setErrors({ non_field: 'Échec de la mise à jour. Réessayez.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card-parchment">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold profile-avatar-jdr">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="title-medieval text-xl">Profil de l'aventurier</h1>
            <p className="text-sm profile-subtitle-jdr">
              Modifiez votre nom et votre email de contact.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium label-jdr">
              Nom d'aventurier
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-parchment"
              placeholder="Votre pseudo"
            />
            {errors.username && (
              <p className="text-sm mt-1 error-text-jdr">
                {errors.username}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium label-jdr">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-parchment"
              placeholder="votre@email.com"
            />
            {errors.email && (
              <p className="text-sm mt-1 error-text-jdr">
                {errors.email}
              </p>
            )}
          </div>

          {errors.non_field && (
            <p className="text-sm error-text-jdr">
              {errors.non_field}
            </p>
          )}
          {success && (
            <p className="text-sm success-text-jdr">
              Profil mis à jour avec succès.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-medieval w-full justify-center"
          >
            {loading ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </form>
      </div>
    </div>
  )
}
