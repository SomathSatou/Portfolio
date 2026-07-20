import React from 'react'
import { useAuth } from './useAuth'

export default function RegisterPage() {
  const { register } = useAuth()
  const [username, setUsername] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [passwordConfirm, setPasswordConfirm] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username || !email || !password || !passwordConfirm) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await register(username, email, password, passwordConfirm)
      window.location.hash = '#/jdr/login'
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as Record<string, unknown>).response === 'object'
      ) {
        const resp = (err as { response: { data: Record<string, string[]> } }).response
        const messages = Object.values(resp.data).flat()
        setError(messages.join(' '))
      } else {
        setError("Erreur lors de l'inscription.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center parchment-bg px-4 py-8 relative overflow-hidden">
      <div className="absolute top-6 left-6 w-12 h-12 opacity-15" style={{ borderTop: '2px solid #c9a227', borderLeft: '2px solid #c9a227' }} />
      <div className="absolute top-6 right-6 w-12 h-12 opacity-15" style={{ borderTop: '2px solid #c9a227', borderRight: '2px solid #c9a227' }} />
      <div className="absolute bottom-6 left-6 w-12 h-12 opacity-15" style={{ borderBottom: '2px solid #c9a227', borderLeft: '2px solid #c9a227' }} />
      <div className="absolute bottom-6 right-6 w-12 h-12 opacity-15" style={{ borderBottom: '2px solid #c9a227', borderRight: '2px solid #c9a227' }} />

      <div className="w-full max-w-md z-10">
        <div className="card-parchment">
          <div className="divider-medieval mb-2"><span>✦</span></div>
          <h1 className="title-medieval text-2xl text-center mb-1">
            Inscription
          </h1>
          <p className="text-center mb-6 text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
            Rejoindre les aventuriers du Monde de Lug
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block mb-1" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.06em', color: '#7c3a0e' }}>
                Nom d'aventurier
              </label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-parchment" placeholder="Votre pseudo" />
            </div>
            <div>
              <label className="block mb-1" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.06em', color: '#7c3a0e' }}>
                Adresse email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-parchment" placeholder="votre@email.com" />
            </div>
            <div>
              <label className="block mb-1" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.06em', color: '#7c3a0e' }}>
                Mot de passe
              </label>
              <input name="password" type="password" autoComplete="new-password" data-clarity-mask="true" value={password} onChange={(e) => setPassword(e.target.value)} className="input-parchment" placeholder="••••••••" />
            </div>
            <div>
              <label className="block mb-1" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.06em', color: '#7c3a0e' }}>
                Confirmer le mot de passe
              </label>
              <input name="password-confirm" type="password" autoComplete="new-password" data-clarity-mask="true" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="input-parchment" placeholder="••••••••" />
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#b91c1c', fontFamily: "'IM Fell English', serif", fontStyle: 'italic' }}>{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-medieval w-full justify-center">
              {loading ? 'Inscription en cours…' : 'Rejoindre l\'aventure'}
            </button>
          </form>

          <div className="divider-medieval mt-4 mb-3"><span>~ ~</span></div>
          <p className="text-center text-sm" style={{ fontFamily: "'IM Fell English', serif", color: '#7c5a30' }}>
            Déjà inscrit ?{' '}
            <a href="#/jdr/login" className="font-medium no-underline hover:underline" style={{ color: '#92400e' }}>Se connecter</a>
          </p>
          <p className="mt-3 text-center text-sm" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
            <a href="#/" className="no-underline hover:underline" style={{ color: '#a0845c' }}>← Retour au portfolio</a>
          </p>
        </div>
      </div>
    </div>
  )
}
