import type { DoctorVerificationStatus } from '../types'

export function isDoctorOnboardingComplete(
  verificationStatus: DoctorVerificationStatus | string | undefined,
  profileCompleted: boolean | undefined,
): boolean {
  return verificationStatus === 'verified' && Boolean(profileCompleted)
}
