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
    <div className="min-h-screen flex items-center justify-center parchment-bg px-4">
      <div className="w-full max-w-md">
        <div className="card-parchment">
          <div className="divider-medieval mb-2"><span>✦</span></div>
          <h1 className="title-medieval text-xl text-center mb-1">
            Parchemin Perdu
          </h1>
          <p className="text-center text-sm mb-6" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
            Saisissez votre email pour recevoir un lien de réinitialisation.
          </p>

          {success ? (
            <div className="rounded p-4 text-center" style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.3)' }}>
              <p className="text-sm font-medium" style={{ fontFamily: "'IM Fell English', serif", color: '#7c3a0e' }}>
                Si cet email est enregistré, un parchemin vous a été envoyé.
              </p>
              <p className="text-xs mt-1" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
                Vérifiez vos spams si vous ne le recevez pas.
              </p>
              <a href="#/jdr/login" className="mt-4 inline-block btn-medieval-outline text-sm">
                ← Retour à la connexion
              </a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block mb-1" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.06em', color: '#7c3a0e' }}>
                  Adresse email
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-parchment" placeholder="votre@email.com" />
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#b91c1c', fontFamily: "'IM Fell English', serif", fontStyle: 'italic' }}>{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-medieval w-full justify-center">
                {loading ? 'Envoi du parchemin…' : 'Envoyer le lien'}
              </button>

              <p className="text-center text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
                <a href="#/jdr/login" className="no-underline hover:underline" style={{ color: '#a0845c' }}>
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
