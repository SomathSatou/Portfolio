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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#0f172a' }}>
      {/* Scan-line overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(14,165,233,0.02) 2px, rgba(14,165,233,0.02) 4px)' }} />

      <div className="w-full max-w-md z-10">
        <div className="card-neon">
          <div className="text-center mb-6">
            <h1 className="title-neon text-3xl mb-1">IRL RPG</h1>
            <p className="text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.2em', color: '#84cc16' }}>AUTHENTIFICATION</p>
            <div className="mt-3 h-px" style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9, transparent)' }} />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em', color: '#0ea5e9' }}>
                EMAIL
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-neon" placeholder="votre@email.com" />
            </div>

            <div>
              <label className="block mb-1 text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em', color: '#0ea5e9' }}>
                MOT DE PASSE
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-neon" placeholder="••••••••" />
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#f87171', fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.04em' }}>{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-neon-lime w-full justify-center">
              {loading ? 'CONNEXION…' : 'INITIALISER SESSION'}
            </button>

            <p className="text-center text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em' }}>
              <a href="#/irlrpg/forgot-password" className="no-underline hover:underline transition-colors" style={{ color: '#475569' }}>
                MOT DE PASSE OUBLIÉ
              </a>
            </p>
          </form>

          <div className="mt-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.3), transparent)' }} />

          <p className="mt-4 text-center text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em', color: '#334155' }}>
            <a href="#/" className="no-underline hover:text-slate-400 transition-colors" style={{ color: '#334155' }}>← PORTFOLIO</a>
          </p>
        </div>
      </div>
    </div>
  )
}
