import { useQuery } from '@tanstack/react-query'
import { getDoctorProfile } from '../../doctor-onboarding/api/doctorOnboardingApi'
import { DOCTOR_PROFILE_QUERY_KEY } from '../../doctor-onboarding/hooks/useDoctorOnboarding'
import { resolveDoctorTimezone } from '../../../lib/doctorTimezone'

export function useDoctorTimezone() {
  const profileQuery = useQuery({
    queryKey: DOCTOR_PROFILE_QUERY_KEY,
    queryFn: getDoctorProfile,
    staleTime: 60_000,
  })

  const doctorTimezone = resolveDoctorTimezone(profileQuery.data?.timezone)

  return {
    doctorTimezone,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    profile: profileQuery.data,
    refetch: profileQuery.refetch,
  }
}
