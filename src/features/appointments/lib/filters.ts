import type { AppointmentFilterTab } from '../constants'
import type { DoctorAppointment } from '../types'

export function filterAppointments(
  appointments: DoctorAppointment[],
  tab: AppointmentFilterTab,
  search: string,
): DoctorAppointment[] {
  const query = search.trim().toLowerCase()

  return appointments.filter((item) => {
    const matchesSearch =
      !query ||
      (item.issue?.toLowerCase().includes(query) ?? false) ||
      (item.doctor_name?.toLowerCase().includes(query) ?? false) ||
      (item.patient_name?.toLowerCase().includes(query) ?? false) ||
      (item.patient_email?.toLowerCase().includes(query) ?? false) ||
      item.id.toLowerCase().includes(query)

    if (!matchesSearch) return false

    switch (tab) {
      case 'all':
        return true
      case 'pending':
        return (
          item.doctor_status === 'pending' || item.workflow_status === 'pending'
        )
      case 'confirmed':
        return (
          item.doctor_status === 'confirm' || item.workflow_status === 'confirmed'
        )
      case 'upcoming':
        return (
          item.status === 'upcoming' ||
          item.doctor_status === 'postponed' ||
          item.doctor_status === 'confirm'
        )
      case 'past':
        return item.status === 'past' || item.doctor_status === 'done'
      case 'cancelled':
        return (
          item.status === 'cancelled' || item.doctor_status === 'cancelled'
        )
      default:
        return true
    }
  })
}

export function sortAppointments(
  appointments: DoctorAppointment[],
): DoctorAppointment[] {
  return [...appointments].sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  )
}
