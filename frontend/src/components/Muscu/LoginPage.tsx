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
      window.location.hash = '#/irlrpg/dashboard'
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setError(axiosErr.response?.data?.detail || 'Identifiants invalides.')
      } else {
        setError('Identifiants invalides.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden theme-irlrpg">
      {/* Scan-line overlay */}
      <div className="absolute inset-0 pointer-events-none scanline-overlay" />

      <div className="w-full max-w-md z-10">
        <div className="card-neon">
          <div className="text-center mb-6">
            <h1 className="title-neon text-3xl mb-1">IRL RPG</h1>
            <p className="neon-label-lime">AUTHENTIFICATION</p>
            <div className="mt-3 h-px neon-divider" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
            <div>
              <label htmlFor="muscu-login-email" className="block neon-label mb-1">EMAIL</label>
              <input id="muscu-login-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-neon" placeholder="votre@email.com" />
            </div>

            <div>
              <label htmlFor="muscu-login-password" className="block neon-label mb-1">MOT DE PASSE</label>
              <input id="muscu-login-password" name="password" type="password" autoComplete="current-password" data-clarity-mask="true" value={password} onChange={(e) => setPassword(e.target.value)} className="input-neon" placeholder="••••••••" />
            </div>

            {error && (
              <p className="neon-error">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-neon-lime w-full justify-center">
              {loading ? 'CONNEXION…' : 'INITIALISER SESSION'}
            </button>

            <p className="text-center neon-label">
              <a href="#/irlrpg/forgot-password" className="neon-link hover:underline transition-colors">
                MOT DE PASSE OUBLIÉ
              </a>
            </p>
          </form>

          <div className="mt-4 h-px neon-divider-faded" />

          <p className="mt-4 text-center neon-label">
            <a href="#/" className="neon-link-muted hover:text-slate-400 transition-colors">← PORTFOLIO</a>
          </p>
        </div>
      </div>
    </div>
  )
}
