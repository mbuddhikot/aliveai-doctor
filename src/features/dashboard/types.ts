import type { DoctorAppointment } from '../appointments/types'

export type DoctorDashboardDoctor = {
  id: string
  full_name: string
  specialty?: string | null
  verification_status: string
  is_active: boolean
}

export type DoctorDashboardToday = {
  date: string
  appointment_count: number
  next_appointment?: DoctorAppointment | null
}

export type DoctorDashboardQueues = {
  pending_approval: number
  upcoming_7d: number
  confirmed_total: number
}

export type DoctorDashboardResponse = {
  doctor: DoctorDashboardDoctor
  today: DoctorDashboardToday
  queues: DoctorDashboardQueues
  recent_appointments: DoctorAppointment[]
}

export type AnalyticsRange = {
  from: string
  to: string
}

export type AnalyticsTotals = {
  appointments_total: number
  pending: number
  confirmed: number
  in_progress: number
  completed: number
  cancelled: number
  rejected: number
}

export type AnalyticsRevenue = {
  currency: string
  amount: number
}

export type AnalyticsIssue = {
  issue: string
  count: number
}

export type AnalyticsPerDay = {
  date: string
  count: number
}

export type DoctorAnalyticsResponse = {
  range: AnalyticsRange
  totals: AnalyticsTotals
  revenue: AnalyticsRevenue
  top_issues: AnalyticsIssue[]
  per_day: AnalyticsPerDay[]
}

export type AppointmentStartResponse = {
  appointment_id: string
  status: string
  started_at: string
  join_url?: string | null
  duration_minutes: number
}
