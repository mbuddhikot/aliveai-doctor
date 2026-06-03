import type { DoctorAppointment } from '../appointments/types'

/** From GET /v1/doctor/patients — DoctorPatientRecord */
export type DoctorPatientRecord = {
  user_id: string
  email: string
  name: string
  first_name?: string | null
  last_name?: string | null
  mobile_number?: string | null
  appointment_count: number
  last_appointment_at: string
}

export type DoctorPatientListResponse = {
  data: DoctorPatientRecord[]
  total: number
  limit: number
  offset: number
}

export type PatientSummary = {
  key: string
  patientId: string | null
  name: string
  email: string | null
  totalVisits: number
  lastVisitAt: string | null
  nextVisitAt: string | null
  pendingCount: number
  appointments: DoctorAppointment[]
}
