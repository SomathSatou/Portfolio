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
      await axios.post('/api/muscu/auth/password-reset/confirm/', {
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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f172a' }}>
        <div className="w-full max-w-md">
          <div className="card-neon text-center">
            <p className="mb-4 text-sm" style={{ color: '#f87171', fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.06em' }}>
              LIEN INVALIDE OU EXPIRÉ
            </p>
            <a href="#/irlrpg/forgot-password" className="btn-neon text-xs">NOUVEAU LIEN</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#0f172a' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(14,165,233,0.02) 2px, rgba(14,165,233,0.02) 4px)' }} />

      <div className="w-full max-w-md z-10">
        <div className="card-neon">
          <div className="text-center mb-6">
            <h1 className="title-neon text-2xl mb-1">RESET MDP</h1>
            <p className="text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.15em', color: '#475569' }}>NOUVEAU MOT DE PASSE</p>
            <div className="mt-3 h-px" style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9, transparent)' }} />
          </div>

          {success ? (
            <div className="rounded p-4 text-center" style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.3)' }}>
              <p className="text-sm font-medium" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.06em', color: '#84cc16' }}>
                MOT DE PASSE MIS À JOUR
              </p>
              <a href="#/irlrpg/login" className="mt-4 inline-block btn-neon-lime text-xs">SE CONNECTER</a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em', color: '#0ea5e9' }}>NOUVEAU MDP</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-neon" placeholder="••••••••" minLength={8} />
              </div>
              <div>
                <label className="block mb-1 text-xs" style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em', color: '#0ea5e9' }}>CONFIRMER MDP</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-neon" placeholder="••••••••" minLength={8} />
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#f87171', fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.04em' }}>{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-neon w-full justify-center">
                {loading ? 'MISE À JOUR…' : 'METTRE À JOUR'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
