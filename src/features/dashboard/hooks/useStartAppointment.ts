import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DOCTOR_APPOINTMENTS_QUERY_KEY } from '../../appointments/api/appointmentsApi'
import { extractApiErrorMessage } from '../../../lib/apiClient'
import { toastSuccess } from '../../../lib/toast'
import { DOCTOR_PATIENTS_QUERY_KEY } from '../../patients/api/patientsApi'
import {
  DOCTOR_ANALYTICS_QUERY_KEY,
  DOCTOR_DASHBOARD_QUERY_KEY,
  startDoctorAppointment,
} from '../api/dashboardApi'

export function useStartAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (appointmentId: string) => startDoctorAppointment(appointmentId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_DASHBOARD_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_ANALYTICS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_PATIENTS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_APPOINTMENTS_QUERY_KEY] })
      if (data.join_url) {
        toastSuccess('Opening video call')
        window.open(data.join_url, '_blank', 'noopener,noreferrer')
      } else {
        toastSuccess('Appointment started')
      }
    },
  })
}

export function startAppointmentErrorMessage(err: unknown): string {
  return extractApiErrorMessage(err, 'Unable to start appointment')
}
