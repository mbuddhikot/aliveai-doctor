import { useQuery } from '@tanstack/react-query'
import { getDoctorVerificationStatus } from '../../doctor-onboarding/api/doctorOnboardingApi'

export function useDoctorId() {
  const query = useQuery({
    queryKey: ['doctor-verification-status'],
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
