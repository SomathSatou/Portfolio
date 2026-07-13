import { createContext, useContext } from 'react'
import type { ConsentState } from '../hooks/useCookieConsent'

export const CookieConsentContext = createContext<ConsentState | null>(null)

export function useCookieConsentContext(): ConsentState {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) {
    throw new Error('useCookieConsentContext must be used within CookieConsentProvider')
  }
  return ctx
}
