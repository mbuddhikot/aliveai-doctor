import type { DoctorAppointment } from '../appointments/types'

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
