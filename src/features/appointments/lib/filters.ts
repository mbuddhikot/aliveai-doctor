import type { AppointmentFilterTab } from '../constants'
import type { DoctorAppointment, DoctorAppointmentStatus } from '../types'
import { isActiveConfirmedAppointment, isPastOrDoneAppointment } from './appointmentStatus'
import { isAppointmentUpcoming } from './format'

/** Maps UI tabs to `GET /v1/doctor/appointments` status query param. */
export function tabToApiStatus(
  tab: AppointmentFilterTab,
): DoctorAppointmentStatus | undefined {
  switch (tab) {
    case 'pending':
      return 'pending'
    case 'confirmed':
      return 'confirm'
    case 'cancelled':
      return 'cancelled'
    case 'past':
      return 'done'
    default:
      return undefined
  }
}

/** Tabs filtered on the server via `status` / `q` — no extra client tab filter. */
export function tabUsesServerFilter(tab: AppointmentFilterTab): boolean {
  return tab !== 'upcoming' && tab !== 'all'
}

/** Refine server results for tabs where time/status needs client-side checks. */
export function applyClientTabFilter(
  appointments: DoctorAppointment[],
  tab: AppointmentFilterTab,
): DoctorAppointment[] {
  if (tab === 'upcoming') {
    return appointments.filter(
      (item) =>
        !isPastOrDoneAppointment(item) &&
        (item.status === 'upcoming' ||
          item.doctor_status === 'postponed' ||
          isActiveConfirmedAppointment(item)),
    )
  }

  if (tab === 'confirmed') {
    return appointments.filter((item) => isActiveConfirmedAppointment(item))
  }

  if (tab === 'past') {
    return appointments.filter(
      (item) =>
        isPastOrDoneAppointment(item) ||
        item.status === 'past' ||
        item.doctor_status === 'done',
    )
  }

  return appointments
}

/** Best tab to show a specific appointment when opening My Appointments from a deep link. */
export function resolveTabForAppointment(
  appointment: DoctorAppointment,
): AppointmentFilterTab {
  if (
    appointment.doctor_status === 'pending' ||
    appointment.workflow_status === 'pending'
  ) {
    return 'pending'
  }

  if (
    appointment.status === 'cancelled' ||
    appointment.doctor_status === 'cancelled' ||
    appointment.workflow_status === 'reject'
  ) {
    return 'cancelled'
  }

  if (
    isPastOrDoneAppointment(appointment) ||
    appointment.doctor_status === 'done' ||
    appointment.status === 'past'
  ) {
    return 'past'
  }

  if (isActiveConfirmedAppointment(appointment)) {
    return 'confirmed'
  }

  if (
    appointment.status === 'upcoming' ||
    appointment.doctor_status === 'postponed' ||
    isAppointmentUpcoming(appointment)
  ) {
    return 'upcoming'
  }

  return 'all'
}

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
        return isActiveConfirmedAppointment(item)
      case 'upcoming':
        return (
          (item.status === 'upcoming' ||
            item.doctor_status === 'postponed' ||
            isActiveConfirmedAppointment(item)) &&
          !isPastOrDoneAppointment(item)
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
