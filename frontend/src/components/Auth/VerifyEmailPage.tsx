import React from 'react'

function getToken(): string {
  const hash = window.location.hash
  const queryStart = hash.indexOf('?')
  if (queryStart === -1) return ''
  return new URLSearchParams(hash.slice(queryStart + 1)).get('token') ?? ''
}

/**
 * Page de vérification d'email — cible des liens envoyés à l'inscription
 * (`#/verify-email?token=...`). Partagée entre JDR, IRL RPG et IdleOne.
 */
export default function VerifyEmailPage() {
  const [state, setState] = React.useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    const token = getToken()
    if (!token) {
      setState('error')
      setMessage('Lien de confirmation invalide : aucun token fourni.')
      return
    }

    let cancelled = false
    fetch('/api/auth/verify-email/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok) {
          setState('success')
          setMessage(body.detail ?? 'Email confirmé avec succès.')
        } else {
          setState('error')
          setMessage(body.detail ?? 'Lien invalide ou expiré.')
        }
      })
      .catch(() => {
        if (cancelled) return
        setState('error')
        setMessage('Une erreur est survenue. Réessayez plus tard.')
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-primary mb-4">Confirmation d'email</h1>
        {state === 'loading' && (
          <p className="text-gray-600 dark:text-gray-300">Vérification en cours…</p>
        )}
        {state === 'success' && (
          <>
            <p className="text-green-700 dark:text-green-400 mb-6">{message}</p>
            <a href="#/" className="btn btn-primary inline-block">Retour à l'accueil</a>
          </>
        )}
        {state === 'error' && (
          <>
            <p className="text-red-700 dark:text-red-400 mb-6">{message}</p>
            <a href="#/" className="btn btn-outline inline-block">Retour à l'accueil</a>
          </>
        )}
      </div>
    </div>
  )
}
