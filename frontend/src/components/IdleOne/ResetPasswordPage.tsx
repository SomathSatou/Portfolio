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

/**
 * Réinitialisation de mot de passe IdleOne — cible des liens email
 * envoyés depuis le jeu Unity (`#/idleone/reset-password?uid=...&token=...`).
 * Style neutre (thème portfolio), le jeu n'a pas d'interface web.
 */
export default function IdleOneResetPasswordPage() {
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
      await axios.post('/api/idleone/auth/password-reset/confirm/', {
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-primary mb-1 text-center">IdleOne</h1>
        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-6">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        {!isValidLink ? (
          <p className="text-center text-red-700 dark:text-red-400">
            Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis le jeu.
          </p>
        ) : success ? (
          <div className="text-center">
            <p className="text-green-700 dark:text-green-400 mb-6">
              Mot de passe mis à jour avec succès ! Vous pouvez retourner dans le jeu.
            </p>
            <a href="#/" className="btn btn-primary inline-block">Retour à l'accueil</a>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nouveau mot de passe</label>
              <input
                name="new-password" type="password" autoComplete="new-password"
                data-clarity-mask="true" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-base w-full" placeholder="••••••••" minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirmer le mot de passe</label>
              <input
                name="new-password-confirm" type="password" autoComplete="new-password"
                data-clarity-mask="true" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-base w-full" placeholder="••••••••" minLength={8}
              />
            </div>

            {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
