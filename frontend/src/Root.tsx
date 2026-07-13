import App from './App'
import { CookieConsentContext } from './components/CookieConsentContext'
import CookieConsent from './components/CookieConsent'
import ClarityLoader from './components/ClarityLoader'
import { useCookieConsent } from './hooks/useCookieConsent'

export default function Root() {
  const consent = useCookieConsent()
  return (
    <CookieConsentContext.Provider value={consent}>
      <App />
      <CookieConsent />
      <ClarityLoader />
    </CookieConsentContext.Provider>
  )
}
