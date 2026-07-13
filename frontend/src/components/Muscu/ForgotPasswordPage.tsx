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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden theme-irlrpg">
      <div className="absolute inset-0 pointer-events-none scanline-overlay" />

      <div className="w-full max-w-md z-10">
        <div className="card-neon">
          <div className="text-center mb-6">
            <h1 className="title-neon text-2xl mb-1">RÉCUPÉRATION</h1>
            <p className="neon-label">MOT DE PASSE OUBLIÉ</p>
            <div className="mt-3 h-px neon-divider" />
          </div>

          {success ? (
            <div className="rounded p-4 text-center neon-success-box">
              <p className="neon-success-text">
                LIEN ENVOYÉ — VÉRIFIEZ VOS SPAMS
              </p>
              <a href="#/irlrpg/login" className="mt-4 inline-block btn-neon text-xs">
                ← RETOUR CONNEXION
              </a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block neon-label mb-1">EMAIL</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-neon" placeholder="votre@email.com" />
              </div>

              {error && (
                <p className="neon-error">{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-neon w-full justify-center">
                {loading ? 'ENVOI…' : 'ENVOYER LE LIEN'}
              </button>

              <p className="text-center neon-label">
                <a href="#/irlrpg/login" className="neon-link hover:underline">← RETOUR</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
