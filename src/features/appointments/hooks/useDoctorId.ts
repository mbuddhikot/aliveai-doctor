import { useQuery } from '@tanstack/react-query'
import { getDoctorProfile } from '../../doctor-onboarding/api/doctorOnboardingApi'
import { getDoctorVerificationStatus } from '../../doctor-onboarding/api/doctorOnboardingApi'
import {
  DOCTOR_PROFILE_QUERY_KEY,
  DOCTOR_VERIFICATION_QUERY_KEY,
} from '../../doctor-onboarding/hooks/useDoctorOnboarding'

export function useDoctorId() {
  const verificationQuery = useQuery({
    queryKey: DOCTOR_VERIFICATION_QUERY_KEY,
    queryFn: getDoctorVerificationStatus,
    staleTime: 60_000,
  })

  const profileQuery = useQuery({
    queryKey: DOCTOR_PROFILE_QUERY_KEY,
    queryFn: getDoctorProfile,
    staleTime: 60_000,
  })

  const doctorId =
    verificationQuery.data?.doctor_id?.trim() ||
    profileQuery.data?.id?.trim() ||
    null

  return {
    doctorId,
    isLoading: verificationQuery.isLoading || profileQuery.isLoading,
    isError: verificationQuery.isError && profileQuery.isError,
    error: verificationQuery.error ?? profileQuery.error,
    refetch: () => {
      void verificationQuery.refetch()
      void profileQuery.refetch()
    },
  }
}
