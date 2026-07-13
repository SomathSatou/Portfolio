import { useCallback, useEffect, useMemo, useState } from 'react'

export type ConsentCategories = {
  necessary: true
  functional: boolean
  analytics: boolean
}

export type ConsentState = {
  decided: boolean
  categories: ConsentCategories
  showBanner: boolean
  showPreferences: boolean
  acceptAll: () => void
  refuseAll: () => void
  save: (categories: ConsentCategories) => void
  openPreferences: () => void
  closePreferences: () => void
  hasConsent: (category: keyof ConsentCategories) => boolean
}

const STORAGE_KEY = 'cookieConsent'

function getDoNotTrack(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes'
}

function getDefaultCategories(): ConsentCategories {
  return {
    necessary: true,
    functional: false,
    analytics: false,
  }
}

function loadStoredConsent(): { decided: boolean; categories: ConsentCategories } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { decided?: boolean; categories?: Partial<ConsentCategories> }
    return {
      decided: Boolean(parsed.decided),
      categories: {
        necessary: true,
        functional: Boolean(parsed.categories?.functional),
        analytics: Boolean(parsed.categories?.analytics),
      },
    }
  } catch {
    return null
  }
}

function persistConsent(decided: boolean, categories: ConsentCategories): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        decided,
        categories: {
          necessary: true,
          functional: categories.functional,
          analytics: categories.analytics,
        },
      })
    )
  } catch {
    // ignore storage errors
  }
}

export function useCookieConsent(): ConsentState {
  const [stored, setStored] = useState<{ decided: boolean; categories: ConsentCategories } | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)

  useEffect(() => {
    setStored(loadStoredConsent())
  }, [])

  const categories = useMemo<ConsentCategories>(() => {
    if (stored) return stored.categories
    const defaults = getDefaultCategories()
    return defaults
  }, [stored])

  const decided = stored?.decided ?? false
  const doNotTrack = useMemo(() => getDoNotTrack(), [])

  const acceptAll = useCallback(() => {
    const next: ConsentCategories = {
      necessary: true,
      functional: true,
      analytics: doNotTrack ? false : true,
    }
    persistConsent(true, next)
    setStored({ decided: true, categories: next })
    setShowPreferences(false)
  }, [doNotTrack])

  const refuseAll = useCallback(() => {
    const next: ConsentCategories = {
      necessary: true,
      functional: false,
      analytics: false,
    }
    persistConsent(true, next)
    setStored({ decided: true, categories: next })
    setShowPreferences(false)
  }, [])

  const save = useCallback(
    (next: ConsentCategories) => {
      const sanitized: ConsentCategories = {
        necessary: true,
        functional: next.functional,
        analytics: doNotTrack ? false : next.analytics,
      }
      persistConsent(true, sanitized)
      setStored({ decided: true, categories: sanitized })
      setShowPreferences(false)
    },
    [doNotTrack]
  )

  const openPreferences = useCallback(() => setShowPreferences(true), [])
  const closePreferences = useCallback(() => setShowPreferences(false), [])

  const hasConsent = useCallback(
    (category: keyof ConsentCategories) => {
      return categories[category] === true
    },
    [categories]
  )

  return {
    decided,
    categories,
    showBanner: !decided,
    showPreferences,
    acceptAll,
    refuseAll,
    save,
    openPreferences,
    closePreferences,
    hasConsent,
  }
}
