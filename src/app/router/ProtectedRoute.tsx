import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { getDoctorVerificationStatus } from '../../features/doctor-onboarding/api/doctorOnboardingApi'
import { DOCTOR_VERIFICATION_QUERY_KEY } from '../../features/doctor-onboarding/hooks/useDoctorOnboarding'
import { isDoctorOnboardingComplete } from '../../features/doctor-onboarding/utils/access'

export function ProtectedRoute() {
  const { user, isAuthenticated, authInitializing, syncUserVerified } = useAuth()
  const location = useLocation()
  const isOnboardingPath = location.pathname.startsWith('/doctor-onboarding')

  const shouldCheckDoctorVerification =
    isAuthenticated && user?.role === 'doctor' && user.is_verified !== true

  const verificationQuery = useQuery({
    queryKey: DOCTOR_VERIFICATION_QUERY_KEY,
    queryFn: getDoctorVerificationStatus,
    enabled: shouldCheckDoctorVerification,
    staleTime: 30_000,
  })

  const doctorVerifiedOnServer = verificationQuery.data
    ? isDoctorOnboardingComplete(
        verificationQuery.data.verification_status,
        verificationQuery.data.profile_completed,
      )
    : false

  const needsDoctorOnboarding =
    user?.role === 'doctor' &&
    user.is_verified !== true &&
    !doctorVerifiedOnServer

  useEffect(() => {
    if (!doctorVerifiedOnServer || user?.is_verified) return
    syncUserVerified(true)
  }, [doctorVerifiedOnServer, syncUserVerified, user?.is_verified])

  if (authInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm font-medium text-[#64748b]">
        Loading your account...
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  if (
    shouldCheckDoctorVerification &&
    verificationQuery.isLoading &&
    !verificationQuery.data
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm font-medium text-[#64748b]">
        Checking verification status...
      </div>
    )
  }

  if (needsDoctorOnboarding && !isOnboardingPath) {
    return (
      <Navigate
        to="/doctor-onboarding"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  if (!needsDoctorOnboarding && isOnboardingPath) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
