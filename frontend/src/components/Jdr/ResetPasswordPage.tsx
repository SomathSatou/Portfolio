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
      <div className="min-h-screen flex items-center justify-center parchment-bg px-4">
        <div className="w-full max-w-md">
          <div className="card-parchment text-center">
            <p className="font-medium mb-4" style={{ fontFamily: "'IM Fell English', serif", color: '#b91c1c' }}>
              Ce parchemin est invalide ou a expiré.
            </p>
            <a href="#/jdr/forgot-password" className="btn-medieval">
              Demander un nouveau lien
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center parchment-bg px-4">
      <div className="w-full max-w-md">
        <div className="card-parchment">
          <div className="divider-medieval mb-2"><span>✦</span></div>
          <h1 className="title-medieval text-xl text-center mb-1">
            Nouveau Mot de Passe
          </h1>
          <p className="text-center text-sm mb-6" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: '#a0845c' }}>
            Choisissez un nouveau mot de passe sécurisé.
          </p>

          {success ? (
            <div className="rounded p-4 text-center" style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.3)' }}>
              <p className="text-sm font-medium" style={{ fontFamily: "'IM Fell English', serif", color: '#7c3a0e' }}>
                Mot de passe mis à jour avec succès !
              </p>
              <a href="#/jdr/login" className="mt-4 inline-block btn-medieval">
                Entrer dans le monde
              </a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block mb-1" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.06em', color: '#7c3a0e' }}>
                  Nouveau mot de passe
                </label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-parchment" placeholder="••••••••" minLength={8} />
              </div>
              <div>
                <label className="block mb-1" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.06em', color: '#7c3a0e' }}>
                  Confirmer le mot de passe
                </label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-parchment" placeholder="••••••••" minLength={8} />
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#b91c1c', fontFamily: "'IM Fell English', serif", fontStyle: 'italic' }}>{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-medieval w-full justify-center">
                {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
