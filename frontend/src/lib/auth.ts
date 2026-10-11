const ACCESS_KEY = 'auth_access'
const REFRESH_KEY = 'auth_refresh'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function hasSession(): boolean {
  return Boolean(getAccessToken())
}

export const LOGIN_ERROR_INVALID = 'Identifiants invalides.'
export const LOGIN_ERROR_SERVER = 'Le serveur est indisponible pour le moment. Réessayez dans quelques instants.'
export const LOGIN_ERROR_NETWORK = 'Impossible de joindre le serveur. Vérifiez votre connexion.'

interface HttpError {
  response?: { status?: number; data?: { detail?: string } }
}

/** Message utilisateur pour un échec de connexion : distingue identifiants refusés et panne serveur. */
export function loginErrorMessage(err: unknown): string {
  const response = err && typeof err === 'object' ? (err as HttpError).response : undefined
  if (!response) return LOGIN_ERROR_NETWORK
  if ((response.status ?? 0) >= 500) return LOGIN_ERROR_SERVER
  return response.data?.detail || LOGIN_ERROR_INVALID
}
