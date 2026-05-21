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
      item.id.toLowerCase().includes(query)

    if (!matchesSearch) return false

    switch (tab) {
      case 'all':
        return true
      case 'pending':
        return item.workflow_status === 'pending'
      case 'confirmed':
        return item.workflow_status === 'confirmed'
      case 'rejected':
        return item.workflow_status === 'reject'
      case 'upcoming':
        return item.status === 'upcoming'
      case 'past':
        return item.status === 'past'
      case 'cancelled':
        return item.status === 'cancelled'
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
