import type { AuthUser } from '../types'

/** Where to send the user immediately after sign-in or sign-up. */
export function resolvePostAuthPath(
  user: AuthUser | null | undefined,
  fallback = '/dashboard',
): string {
  if (user?.role === 'doctor' && user.is_verified !== true) {
    return '/doctor-onboarding'
  }
  return fallback
}
