import React from 'react'
import axios from 'axios'

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email) {
      setError('Veuillez saisir votre adresse email.')
      return
    }
    setLoading(true)
    try {
      await axios.post('/api/jdr/auth/password-reset/', { email })
      setSuccess(true)
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold text-primary dark:text-primaryLight text-center mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            Saisissez votre email pour recevoir un lien de réinitialisation.
          </p>

          {success ? (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 text-center">
              <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                Si cet email est enregistré, un lien vous a été envoyé.
              </p>
              <p className="text-green-600 dark:text-green-500 text-xs mt-1">
                Vérifiez vos spams si vous ne le recevez pas.
              </p>
              <a
                href="#/jdr/login"
                className="mt-4 inline-block text-sm font-medium text-primary dark:text-primaryLight hover:underline"
              >
                ← Retour à la connexion
              </a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="votre@email.com"
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
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-500">
                <a href="#/jdr/login" className="hover:underline">
                  ← Retour à la connexion
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
