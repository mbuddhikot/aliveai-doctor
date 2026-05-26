import { DateTime } from 'luxon'
import type { DoctorAppointment } from '../../appointments/types'
import type { PatientSummary } from '../../patients/types'
import type { Prescription } from '../types'

function sameCalendarDay(isoA: string, isoB: string): boolean {
  const a = DateTime.fromISO(isoA)
  const b = DateTime.fromISO(isoB)
  if (!a.isValid || !b.isValid) return false
  return a.toISODate() === b.toISODate()
}

function namesMatch(a: string | null | undefined, b: string): boolean {
  if (!a?.trim()) return false
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** Links list prescriptions to a specific visit (appointment). */
export function findPrescriptionsForVisit(
  prescriptions: Prescription[],
  appointment: DoctorAppointment,
  patient: PatientSummary,
): Prescription[] {
  const matches = prescriptions.filter((prescription) => {
    if (
      prescription.appointment_id &&
      prescription.appointment_id === appointment.id
    ) {
      return true
    }

    const patientIdMatch =
      Boolean(appointment.patient_id) &&
      prescription.patient_id === appointment.patient_id
    const patientIdFromSummary =
      Boolean(patient.patientId) &&
      prescription.patient_id === patient.patientId
    const nameMatch =
      namesMatch(prescription.patient_name, patient.name) ||
      namesMatch(prescription.patient_name, appointment.patient_name ?? '')

    if (!patientIdMatch && !patientIdFromSummary && !nameMatch) {
      return false
    }

    if (prescription.appointment_id) {
      return false
    }

    return sameCalendarDay(prescription.created_at, appointment.starts_at)
  })

  return matches.sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  )
}
