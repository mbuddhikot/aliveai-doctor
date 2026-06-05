import { isAppointmentUpcoming } from '../../appointments/lib/format'
import type { PatientSummary } from '../types'

/** Best appointment to open in My Appointments for a patient record. */
export function resolveManageAppointmentId(
  patient: PatientSummary,
): string | null {
  const { appointments } = patient
  if (appointments.length === 0) return null

  if (patient.nextVisitAt) {
    const nextVisit = appointments.find(
      (item) => item.starts_at === patient.nextVisitAt,
    )
    if (nextVisit) return nextVisit.id
  }

  const upcoming = appointments
    .filter((item) => isAppointmentUpcoming(item))
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  if (upcoming[0]) return upcoming[0].id

  const pending = appointments
    .filter(
      (item) =>
        item.workflow_status === 'pending' || item.doctor_status === 'pending',
    )
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
  if (pending[0]) return pending[0].id

  const latest = [...appointments].sort(
    (a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at),
  )
  return latest[0]?.id ?? null
}

export function buildManageAppointmentsPath(patient: PatientSummary): string {
  const appointmentId = resolveManageAppointmentId(patient)
  if (!appointmentId) return '/dashboard/appointments'
  return `/dashboard/appointments?appointment=${encodeURIComponent(appointmentId)}`
}
