import type { DoctorAppointment } from '../../appointments/types'
import type { Prescription } from '../types'

function normalizeName(name?: string | null): string | undefined {
  const trimmed = name?.trim().toLowerCase()
  return trimmed || undefined
}

export function buildPatientIdByName(
  appointments: DoctorAppointment[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const appointment of appointments) {
    const name = normalizeName(appointment.patient_name)
    if (name && appointment.patient_id) {
      map.set(name, appointment.patient_id)
    }
  }
  return map
}

export function resolvePatientId(
  appointment: DoctorAppointment,
  prescriptions: Prescription[],
  patientIdByName: Map<string, string>,
): string | null {
  if (appointment.patient_id) return appointment.patient_id

  const byAppointment = prescriptions.find(
    (item) => item.appointment_id === appointment.id,
  )
  if (byAppointment?.patient_id) return byAppointment.patient_id

  const name = normalizeName(appointment.patient_name)
  if (name) {
    const fromAppointments = patientIdByName.get(name)
    if (fromAppointments) return fromAppointments

    const byName = prescriptions.find(
      (item) => normalizeName(item.patient_name) === name,
    )
    if (byName?.patient_id) return byName.patient_id
  }

  return null
}
