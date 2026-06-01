export type CalendarDisplayStatus = 'pending' | 'upcoming' | 'confirmed'

export type AppointmentMode = 'video' | 'clinic' | 'home'

export type CalendarAppointment = {
  id: string
  patientName: string
  patientEmail?: string
  date: string
  start: string
  end: string
  status: CalendarDisplayStatus
  mode: AppointmentMode
  reason: string
  notes?: string
  joinUrl?: string
}
