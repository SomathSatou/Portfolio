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
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${projectId}");
    `
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
