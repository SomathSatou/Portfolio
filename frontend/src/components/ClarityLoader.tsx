import { useEffect } from 'react'
import { useCookieConsentContext } from './CookieConsentContext'

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void
  }
}

const CLARITY_SCRIPT_ID = 'ms-clarity-script'

export default function ClarityLoader() {
  const { hasConsent } = useCookieConsentContext()
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined

  useEffect(() => {
    if (!projectId) return
    if (!hasConsent('analytics')) return
    if (document.getElementById(CLARITY_SCRIPT_ID)) return

    const script = document.createElement('script')
    script.id = CLARITY_SCRIPT_ID
    script.type = 'text/javascript'
    script.async = true
    script.src = `https://www.clarity.ms/tag/${projectId}`
    document.head.appendChild(script)

    return () => {
      const existing = document.getElementById(CLARITY_SCRIPT_ID)
      if (existing) {
        existing.remove()
      }
    }
  }, [projectId, hasConsent])

  return null
}
