export type AppointmentStatus = 'upcoming' | 'past' | 'cancelled'

export type AppointmentWorkflowStatus = 'pending' | 'confirmed' | 'reject'

export type DoctorAppointment = {
  id: string
  status: AppointmentStatus
  workflow_status: AppointmentWorkflowStatus
  doctor_id?: string | null
  doctor_name?: string | null
  patient_id?: string | null
  patient_name?: string | null
  patient_email?: string | null
  issue?: string | null
  starts_at: string
  ends_at: string
  duration_minutes: number
  fee_amount?: number | null
  fee_currency?: string | null
  video_message?: string | null
  join_url?: string | null
  approved_at?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

export type AppointmentListResponse = {
  data: DoctorAppointment[]
  total: number
}

export type ApproveAppointmentPayload = {
  join_url?: string | null
}

export type RejectAppointmentPayload = {
  reason: string
}

export type RescheduleAppointmentPayload = {
  date: string
  time: string
  duration_minutes?: number | null
}
