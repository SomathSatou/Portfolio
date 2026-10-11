import { describe, expect, it } from 'vitest'
import {
  LOGIN_ERROR_INVALID,
  LOGIN_ERROR_NETWORK,
  LOGIN_ERROR_SERVER,
  loginErrorMessage,
} from '../lib/auth'

describe('loginErrorMessage', () => {
  it('returns a network message when there is no HTTP response', () => {
    expect(loginErrorMessage(new Error('Network Error'))).toBe(LOGIN_ERROR_NETWORK)
    expect(loginErrorMessage(undefined)).toBe(LOGIN_ERROR_NETWORK)
  })

  it('returns a server message for 5xx responses (never "identifiants invalides")', () => {
    expect(loginErrorMessage({ response: { status: 502 } })).toBe(LOGIN_ERROR_SERVER)
    expect(loginErrorMessage({ response: { status: 500, data: { detail: 'boom' } } })).toBe(LOGIN_ERROR_SERVER)
  })

  it('surfaces the backend detail for 4xx responses', () => {
    expect(loginErrorMessage({ response: { status: 403, data: { detail: 'Veuillez confirmer votre email.' } } })).toBe(
      'Veuillez confirmer votre email.',
    )
  })

  it('falls back to the generic invalid credentials message on 401 without detail', () => {
    expect(loginErrorMessage({ response: { status: 401 } })).toBe(LOGIN_ERROR_INVALID)
  })
})
