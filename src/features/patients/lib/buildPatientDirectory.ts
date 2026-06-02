import type { DoctorAppointment } from '../../appointments/types'
import { isAppointmentUpcoming } from '../../appointments/lib/format'
import type { PatientSummary } from '../types'

function patientKey(appointment: DoctorAppointment): string {
  if (appointment.patient_id) return `id:${appointment.patient_id}`
  if (appointment.patient_email) {
    return `email:${appointment.patient_email.toLowerCase()}`
  }
  if (appointment.patient_name) {
    return `name:${appointment.patient_name.toLowerCase()}`
  }
  return `appt:${appointment.id}`
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return local
    .replace(/[._+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function resolvePatientName(appointment: DoctorAppointment): string {
  const fromApi = appointment.patient_name?.trim()
  if (fromApi) return fromApi

  if (appointment.patient_email) {
    return nameFromEmail(appointment.patient_email)
  }

  return ''
}

export function buildPatientDirectory(
  appointments: DoctorAppointment[],
): PatientSummary[] {
  const map = new Map<string, PatientSummary>()

  for (const appointment of appointments) {
    const key = patientKey(appointment)
    const existing = map.get(key)

    if (!existing) {
      const name = resolvePatientName(appointment)
      map.set(key, {
        key,
        patientId: appointment.patient_id ?? null,
        name: name || 'Patient',
        email: appointment.patient_email ?? null,
        totalVisits: 1,
        lastVisitAt: appointment.starts_at || null,
        nextVisitAt:
          isAppointmentUpcoming(appointment) ? appointment.starts_at : null,
        pendingCount: appointment.workflow_status === 'pending' ? 1 : 0,
        appointments: [appointment],
      })
      continue
    }

    existing.totalVisits += 1
    existing.appointments.push(appointment)
    if (appointment.workflow_status === 'pending') {
      existing.pendingCount += 1
    }
    const resolved = resolvePatientName(appointment)
    if (resolved) {
      existing.name = resolved
    }
    if (!existing.email && appointment.patient_email) {
      existing.email = appointment.patient_email
    }
    if (!existing.patientId && appointment.patient_id) {
      existing.patientId = appointment.patient_id
    }

    const starts = appointment.starts_at
    if (starts) {
      if (
        !existing.lastVisitAt ||
        new Date(starts).getTime() > new Date(existing.lastVisitAt).getTime()
      ) {
        existing.lastVisitAt = starts
      }
      if (isAppointmentUpcoming(appointment)) {
        if (
          !existing.nextVisitAt ||
          new Date(starts).getTime() < new Date(existing.nextVisitAt).getTime()
        ) {
          existing.nextVisitAt = starts
        }
      }
    }
  }

  const patients = [...map.values()]

  for (const patient of patients) {
    patient.appointments.sort(
      (a, b) =>
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
    )
  }

  patients.sort((a, b) => {
    const aTime = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0
    const bTime = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0
    return bTime - aTime
  })

  return patients
}

export function filterPatients(
  patients: PatientSummary[],
  query: string,
): PatientSummary[] {
  const q = query.trim().toLowerCase()
  if (!q) return patients
  return patients.filter((p) => p.name.toLowerCase().includes(q))
}
