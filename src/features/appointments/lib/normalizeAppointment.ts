import type {
  AppointmentStatus,
  AppointmentWorkflowStatus,
  DoctorAppointment,
} from '../types'

type RawAppointment = Record<string, unknown>

function isRecord(value: unknown): value is RawAppointment {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function nameFromRecord(record: RawAppointment): string | undefined {
  const direct =
    str(record.full_name) ||
    str(record.fullName) ||
    str(record.name) ||
    str(record.display_name)
  if (direct) return direct

  const first = str(record.first_name) || str(record.firstName)
  const last = str(record.last_name) || str(record.lastName)
  if (first || last) return [first, last].filter(Boolean).join(' ')

  return undefined
}

function normalizeStatus(value: unknown): AppointmentStatus {
  const status = String(value || 'upcoming').toLowerCase()
  if (status === 'past' || status === 'cancelled' || status === 'upcoming') {
    return status
  }
  if (['completed', 'confirmed', 'ongoing'].includes(status)) return 'upcoming'
  return 'upcoming'
}

function normalizeWorkflow(value: unknown): AppointmentWorkflowStatus {
  const workflow = String(value || 'pending').toLowerCase()
  if (workflow === 'confirmed' || workflow === 'reject' || workflow === 'pending') {
    return workflow
  }
  if (workflow === 'rejected') return 'reject'
  return 'pending'
}

export function normalizeDoctorAppointment(item: RawAppointment): DoctorAppointment {
  const patient = isRecord(item.patient) ? item.patient : {}
  const user = isRecord(item.user) ? item.user : isRecord(item.booked_by) ? item.booked_by : {}
  const booker = isRecord(item.booker) ? item.booker : {}

  const patientId =
    str(item.patient_id) ||
    str(item.patientId) ||
    str(patient.id) ||
    str(patient.user_id) ||
    str(user.id) ||
    str(item.user_id)

  const patientName =
    str(item.patient_name) ||
    str(item.patientName) ||
    nameFromRecord(patient) ||
    nameFromRecord(user) ||
    nameFromRecord(booker) ||
    nameFromRecord(item)

  const patientEmail =
    str(item.patient_email) ||
    str(item.patientEmail) ||
    str(patient.email) ||
    str(user.email) ||
    str(booker.email)

  return {
    id: String(item.id || item.appointment_id || crypto.randomUUID()),
    status: normalizeStatus(item.status),
    workflow_status: normalizeWorkflow(
      item.workflow_status ?? item.workflowStatus,
    ),
    doctor_id: str(item.doctor_id) ?? str(item.doctorId) ?? null,
    doctor_name: str(item.doctor_name) ?? str(item.doctorName) ?? null,
    patient_id: patientId ?? null,
    patient_name: patientName ?? null,
    patient_email: patientEmail ?? null,
    issue: str(item.issue) ?? str(item.reason) ?? str(item.purpose) ?? null,
    starts_at: String(item.starts_at || item.start_time || item.date || ''),
    ends_at: String(item.ends_at || item.end_time || item.starts_at || ''),
    doctor_timezone:
      str(item.doctor_timezone) ?? str(item.doctorTimezone) ?? null,
    duration_minutes: Number(item.duration_minutes ?? item.duration ?? 30) || 30,
    fee_amount:
      typeof item.fee_amount === 'number'
        ? item.fee_amount
        : item.fee_amount != null
          ? Number(item.fee_amount)
          : null,
    fee_currency: str(item.fee_currency) ?? null,
    video_message: str(item.video_message) ?? null,
    join_url: str(item.join_url) ?? str(item.joinUrl) ?? null,
    approved_at: str(item.approved_at) ?? null,
    rejected_at: str(item.rejected_at) ?? null,
    rejection_reason: str(item.rejection_reason) ?? null,
    created_at: String(item.created_at || new Date().toISOString()),
    updated_at: String(item.updated_at || new Date().toISOString()),
  }
}

export function normalizeAppointmentList(payload: unknown): DoctorAppointment[] {
  const source = isRecord(payload)
    ? payload.data || payload.appointments || payload.results
    : payload

  if (!Array.isArray(source)) return []
  return source.filter(isRecord).map(normalizeDoctorAppointment)
}
