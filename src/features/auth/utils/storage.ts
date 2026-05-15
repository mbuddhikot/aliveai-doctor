import type { AuthUser } from '../types'

const KEYS = {
  user: 'aliveai.user',
  token: 'aliveai.token',
  refreshToken: 'aliveai.refreshToken',
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function readUserFromStorage(): AuthUser | null {
  const raw = localStorage.getItem(KEYS.user) || sessionStorage.getItem(KEYS.user)
  if (!raw) return null
  return safeJsonParse<AuthUser>(raw)
}

export function writeUserToStorage(user: AuthUser, persist = true): void {
  const target = persist ? localStorage : sessionStorage
  const staleTarget = persist ? sessionStorage : localStorage
  staleTarget.removeItem(KEYS.user)
  target.setItem(KEYS.user, JSON.stringify(user))
}

export function clearUserStorage(): void {
  localStorage.removeItem(KEYS.user)
  sessionStorage.removeItem(KEYS.user)
}

export function readTokenFromStorage(): string | null {
  return localStorage.getItem(KEYS.token) || sessionStorage.getItem(KEYS.token)
}

export function writeTokenToStorage(token: string, persist = true): void {
  const target = persist ? localStorage : sessionStorage
  const staleTarget = persist ? sessionStorage : localStorage
  staleTarget.removeItem(KEYS.token)
  target.setItem(KEYS.token, token)
}

export function clearTokenStorage(): void {
  localStorage.removeItem(KEYS.token)
  sessionStorage.removeItem(KEYS.token)
  localStorage.removeItem(KEYS.refreshToken)
  sessionStorage.removeItem(KEYS.refreshToken)
}

export function readRefreshTokenFromStorage(): string | null {
  return (
    localStorage.getItem(KEYS.refreshToken) ||
    sessionStorage.getItem(KEYS.refreshToken)
  )
}

export function writeRefreshTokenToStorage(
  refreshToken: string,
  persist = true,
): void {
  const target = persist ? localStorage : sessionStorage
  const staleTarget = persist ? sessionStorage : localStorage
  staleTarget.removeItem(KEYS.refreshToken)
  target.setItem(KEYS.refreshToken, refreshToken)
}
