import React from 'react'
import { useCookieConsentContext } from './CookieConsentContext'

function Toggle({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function CookieConsent() {
  const {
    categories,
    showBanner,
    showPreferences,
    acceptAll,
    refuseAll,
    save,
    openPreferences,
    closePreferences,
  } = useCookieConsentContext()

  const [draft, setDraft] = React.useState(categories)

  React.useEffect(() => {
    setDraft(categories)
  }, [categories, showPreferences])

  if (!showBanner && !showPreferences) return null

  return (
    <>
      {showBanner && (
        <aside
          role="dialog"
          aria-label="Consentement cookies"
          className="cookie-banner"
        >
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-700 dark:text-gray-200 text-center md:text-left">
              Ce site utilise des cookies pour mesurer l'audience et améliorer votre expérience.
              Vous pouvez choisir les catégories que vous souhaitez activer.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={acceptAll} className="btn btn-primary text-sm">
                Tout accepter
              </button>
              <button type="button" onClick={refuseAll} className="btn btn-outline text-sm">
                Tout refuser
              </button>
              <button type="button" onClick={openPreferences} className="btn btn-accent text-sm">
                Personnaliser
              </button>
            </div>
          </div>
        </aside>
      )}

      {showPreferences && (
        <div className="cookie-modal-overlay" onClick={closePreferences}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vos choix en matière de cookies"
            className="cookie-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-primary">Vos choix en matière de cookies</h2>
              <button
                type="button"
                onClick={closePreferences}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="card-glass p-4">
                <Toggle
                  id="necessary"
                  label="Nécessaires"
                  checked={true}
                  disabled={true}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Cookies indispensables au fonctionnement du site (thème, session).
                </p>
              </div>

              <div className="card-glass p-4">
                <Toggle
                  id="functional"
                  label="Fonctionnels"
                  checked={draft.functional}
                  onChange={(checked) => setDraft((d) => ({ ...d, functional: checked }))}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Permettent de mémoriser vos préférences (langue, affichage).
                </p>
              </div>

              <div className="card-glass p-4">
                <Toggle
                  id="analytics"
                  label="Analytics"
                  checked={draft.analytics}
                  disabled={navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes'}
                  onChange={(checked) => setDraft((d) => ({ ...d, analytics: checked }))}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Aident à comprendre comment le site est utilisé via Microsoft Clarity.
                </p>
                {(navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes') && (
                  <p className="mt-1 text-xs text-accent2 dark:text-accent1">
                    Désactivé car le signal "Ne pas me pister" de votre navigateur est actif.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={refuseAll} className="btn btn-outline text-sm">
                Tout refuser
              </button>
              <button
                type="button"
                onClick={() => save(draft)}
                className="btn btn-primary text-sm"
              >
                Enregistrer les choix
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
