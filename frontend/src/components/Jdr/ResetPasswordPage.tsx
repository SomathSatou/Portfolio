import React from 'react'
import axios from 'axios'

function getQueryParams(): { uid: string; token: string } {
  const hash = window.location.hash
  const queryStart = hash.indexOf('?')
  if (queryStart === -1) return { uid: '', token: '' }
  const params = new URLSearchParams(hash.slice(queryStart + 1))
  return {
    uid: params.get('uid') ?? '',
    token: params.get('token') ?? '',
  }
}

export default function ResetPasswordPage() {
  const { uid, token } = getQueryParams()

  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState('')

  const isValidLink = uid && token

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await axios.post('/api/jdr/auth/password-reset/confirm/', {
        uid,
        token,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      })
      setSuccess(true)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setError(axiosErr.response?.data?.detail ?? 'Lien invalide ou expiré.')
      } else {
        setError('Une erreur est survenue.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isValidLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-md">
          <div className="card text-center">
            <p className="text-red-600 dark:text-red-400 font-medium mb-4">
              Lien invalide ou expiré.
            </p>
            <a href="#/jdr/forgot-password" className="btn btn-primary">
              Demander un nouveau lien
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold text-primary dark:text-primaryLight text-center mb-2">
            Nouveau mot de passe
          </h1>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            Choisissez un nouveau mot de passe sécurisé.
          </p>

          {success ? (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 text-center">
              <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                Mot de passe mis à jour avec succès !
              </p>
              <a
                href="#/jdr/login"
                className="mt-4 inline-block btn btn-primary"
              >
                Se connecter
              </a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  minLength={8}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center"
              >
                {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
