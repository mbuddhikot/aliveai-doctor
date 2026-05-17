export type AppointmentStatus =
  | 'confirmed'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'no-show'

export type AppointmentMode = 'video' | 'clinic' | 'home'

export type CalendarAppointment = {
  id: string
  patientName: string
  patientEmail?: string
  date: string
  start: string
  end: string
  status: AppointmentStatus
  mode: AppointmentMode
  reason: string
  notes?: string
}
