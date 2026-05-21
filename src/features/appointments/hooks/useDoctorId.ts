import { useQuery } from '@tanstack/react-query'
import { getDoctorVerificationStatus } from '../../doctor-onboarding/api/doctorOnboardingApi'
import { DOCTOR_VERIFICATION_QUERY_KEY } from '../../doctor-onboarding/hooks/useDoctorOnboarding'

export function useDoctorId() {
  const query = useQuery({
    queryKey: DOCTOR_VERIFICATION_QUERY_KEY,
    queryFn: getDoctorVerificationStatus,
    staleTime: 60_000,
  })

  return {
    doctorId: query.data?.doctor_id ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
