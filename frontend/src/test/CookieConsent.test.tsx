import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CookieConsentContext } from '../components/CookieConsentContext'
import CookieConsent from '../components/CookieConsent'
import Footer from '../components/Footer'
import { useCookieConsent } from '../hooks/useCookieConsent'

function renderWithConsent(ui: React.ReactNode) {
  function Wrapper() {
    const consent = useCookieConsent()
    return (
      <CookieConsentContext.Provider value={consent}>
        {ui}
      </CookieConsentContext.Provider>
    )
  }
  return render(<Wrapper />)
}

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    Object.defineProperty(window.navigator, 'doNotTrack', {
      value: undefined,
      configurable: true,
      writable: true,
    })
  })

  it('displays the banner when no consent has been stored', () => {
    renderWithConsent(<CookieConsent />)
    expect(screen.getByRole('dialog', { name: 'Consentement cookies' })).toBeInTheDocument()
    expect(screen.getByText(/Ce site utilise des cookies/)).toBeInTheDocument()
  })

  it('hides the banner and refuses analytics when clicking "Tout refuser"', () => {
    renderWithConsent(<CookieConsent />)
    fireEvent.click(screen.getByRole('button', { name: 'Tout refuser' }))
    expect(screen.queryByRole('dialog', { name: 'Consentement cookies' })).not.toBeInTheDocument()

    const stored = JSON.parse(localStorage.getItem('cookieConsent') || '{}')
    expect(stored.decided).toBe(true)
    expect(stored.categories.analytics).toBe(false)
    expect(stored.categories.functional).toBe(false)
  })

  it('accepts analytics when clicking "Tout accepter"', () => {
    renderWithConsent(<CookieConsent />)
    fireEvent.click(screen.getByRole('button', { name: 'Tout accepter' }))

    const stored = JSON.parse(localStorage.getItem('cookieConsent') || '{}')
    expect(stored.decided).toBe(true)
    expect(stored.categories.analytics).toBe(true)
    expect(stored.categories.functional).toBe(true)
  })

  it('opens the preferences modal from the footer "Cookies" link', () => {
    renderWithConsent(
      <>
        <CookieConsent />
        <Footer />
      </>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tout accepter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cookies' }))
    expect(screen.getByRole('dialog', { name: 'Vos choix en matière de cookies' })).toBeInTheDocument()
  })

  it('saves custom choices from the preferences modal', () => {
    renderWithConsent(<CookieConsent />)
    fireEvent.click(screen.getByRole('button', { name: 'Personnaliser' }))

    const analyticsToggle = screen.getByRole('switch', { name: 'Analytics' })
    fireEvent.click(analyticsToggle)

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les choix' }))

    const stored = JSON.parse(localStorage.getItem('cookieConsent') || '{}')
    expect(stored.categories.analytics).toBe(true)
  })

  it('disables analytics toggle when DoNotTrack is active', () => {
    Object.defineProperty(window.navigator, 'doNotTrack', {
      value: '1',
      configurable: true,
      writable: true,
    })
    renderWithConsent(<CookieConsent />)
    fireEvent.click(screen.getByRole('button', { name: 'Personnaliser' }))
    const analyticsToggle = screen.getByRole('switch', { name: 'Analytics' })
    expect(analyticsToggle).toBeDisabled()
  })
})
