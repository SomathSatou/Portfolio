import React from 'react'
import { useAuth } from './useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      window.location.hash = '#/jdr/dashboard'
    } catch {
      setError('Identifiants invalides.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center parchment-bg px-4 relative overflow-hidden">
      <div className="absolute top-6 left-6 w-12 h-12 opacity-15 corner-tl-jdr" />
      <div className="absolute top-6 right-6 w-12 h-12 opacity-15 corner-tr-jdr" />
      <div className="absolute bottom-6 left-6 w-12 h-12 opacity-15 corner-bl-jdr" />
      <div className="absolute bottom-6 right-6 w-12 h-12 opacity-15 corner-br-jdr" />

      <div className="w-full max-w-md z-10">
        <div className="card-parchment">
          <div className="divider-medieval mb-2"><span>✦</span></div>
          <h1 className="title-medieval text-2xl text-center mb-1">
            Connexion
          </h1>
          <p className="text-center mb-6 text-sm login-subtitle-jdr">
            Le Monde de Lug
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
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
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium label-jdr">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-parchment"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm error-text-jdr">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-medieval w-full justify-center"
            >
              {loading ? 'Vérification…' : 'Entrer dans le monde'}
            </button>

            <p className="text-center text-sm forgot-link-text-jdr">
              <a href="#/jdr/forgot-password" className="no-underline hover:underline forgot-link-jdr">
                Parchemin de réinitialisation ?
              </a>
            </p>
          </form>

          <div className="divider-medieval mt-4 mb-3"><span>~ ~</span></div>

          <p className="text-center text-sm register-text-jdr">
            Pas encore d'aventurier ?{' '}
            <a href="#/jdr/register" className="font-medium no-underline hover:underline register-link-jdr">
              S'inscrire
            </a>
          </p>

          <p className="mt-3 text-center back-link-text-jdr">
            <a href="#/" className="no-underline hover:underline back-link-jdr">← Retour au portfolio</a>
          </p>
        </div>
      </div>
    </div>
  )
}
