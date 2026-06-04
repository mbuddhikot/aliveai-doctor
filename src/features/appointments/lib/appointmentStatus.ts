import type { DoctorAppointment } from '../types'

/** Visit finished or slot time has passed (excluding pending/cancelled). */
export function isPastOrDoneAppointment(appointment: {
  status: string
  workflow_status: string
  doctor_status?: string | null
  starts_at: string
  ends_at: string
}): boolean {
  if (appointment.status === 'past') return true
  if (appointment.doctor_status === 'done') return true

  if (
    appointment.status === 'cancelled' ||
    appointment.doctor_status === 'cancelled' ||
    appointment.workflow_status === 'reject'
  ) {
    return false
  }

  if (
    appointment.doctor_status === 'pending' ||
    appointment.workflow_status === 'pending'
  ) {
    return false
  }

  const endMs = Date.parse(appointment.ends_at || appointment.starts_at)
  if (!Number.isNaN(endMs) && endMs < Date.now()) {
    return true
  }

  return false
}

/** Active confirmed visit — not pending, cancelled, or past/done. */
export function isActiveConfirmedAppointment(
  appointment: DoctorAppointment,
): boolean {
  if (isPastOrDoneAppointment(appointment)) return false
  if (
    appointment.doctor_status === 'pending' ||
    appointment.workflow_status === 'pending'
  ) {
    return false
  }
  return (
    appointment.doctor_status === 'confirm' ||
    appointment.workflow_status === 'confirmed'
  )
}

/** Doctor may write a prescription only after the visit is approved/confirmed. */
export function canCreatePrescriptionForAppointment(appointment: {
  status: string
  workflow_status: string
  doctor_status?: string | null
  patient_id?: string | null
  patient_name?: string | null
}): boolean {
  if (
    appointment.workflow_status === 'pending' ||
    appointment.doctor_status === 'pending'
  ) {
    return false
  }

  if (
    appointment.status === 'cancelled' ||
    appointment.doctor_status === 'cancelled' ||
    appointment.workflow_status === 'reject'
  ) {
    return false
  }

  const isConfirmed =
    appointment.doctor_status === 'confirm' ||
    appointment.workflow_status === 'confirmed'

  if (!isConfirmed) return false

  return Boolean(
    appointment.patient_id?.trim() || appointment.patient_name?.trim(),
  )
}
