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
      await axios.post('/api/muscu/auth/password-reset/', { email }, {
        headers: { 'X-App': 'muscu' },
      })
      setSuccess(true)
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#0f172a' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(14,165,233,0.02) 2px, rgba(14,165,233,0.02) 4px)' }} />

      <div className="w-full max-w-md z-10">
        <div className="card-neon">
          <div className="text-center mb-6">
            <h1 className="title-neon text-2xl mb-1">RÉCUPÉRATION</h1>
            <p className="text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.15em', color: '#475569' }}>MOT DE PASSE OUBLIÉ</p>
            <div className="mt-3 h-px" style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9, transparent)' }} />
          </div>

          {success ? (
            <div className="rounded p-4 text-center" style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.3)' }}>
              <p className="text-sm font-medium" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.06em', color: '#84cc16' }}>
                LIEN ENVOYÉ — VÉRIFIEZ VOS SPAMS
              </p>
              <a href="#/irlrpg/login" className="mt-4 inline-block btn-neon text-xs">
                ← RETOUR CONNEXION
              </a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em', color: '#0ea5e9' }}>EMAIL</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-neon" placeholder="votre@email.com" />
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#f87171', fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.04em' }}>{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-neon w-full justify-center">
                {loading ? 'ENVOI…' : 'ENVOYER LE LIEN'}
              </button>

              <p className="text-center text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em' }}>
                <a href="#/irlrpg/login" className="no-underline hover:underline" style={{ color: '#475569' }}>← RETOUR</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
