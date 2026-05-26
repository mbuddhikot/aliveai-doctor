import type {
  AppointmentStatus,
  AppointmentWorkflowStatus,
  DoctorAppointment,
  DoctorAppointmentStatus,
} from '../types'
import { extractPatientId } from './extractPatientId'

type RawAppointment = Record<string, unknown>

const DOCTOR_STATUSES: DoctorAppointmentStatus[] = [
  'pending',
  'confirm',
  'cancelled',
  'done',
  'postponed',
]

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

function normalizeDoctorStatus(value: unknown): DoctorAppointmentStatus | null {
  const status = String(value || '').toLowerCase()
  if (DOCTOR_STATUSES.includes(status as DoctorAppointmentStatus)) {
    return status as DoctorAppointmentStatus
  }
  if (status === 'confirmed') return 'confirm'
  return null
}

function normalizeStatus(value: unknown): AppointmentStatus {
  const status = String(value || 'upcoming').toLowerCase()
  if (status === 'past' || status === 'cancelled' || status === 'upcoming') {
    return status
  }
  if (['completed', 'done'].includes(status)) return 'past'
  return 'upcoming'
}

function normalizeWorkflow(value: unknown): AppointmentWorkflowStatus {
  const workflow = String(value || 'pending').toLowerCase()
  if (workflow === 'confirmed' || workflow === 'confirm') return 'confirmed'
  if (workflow === 'reject' || workflow === 'rejected') return 'reject'
  if (workflow === 'pending' || workflow === 'pending_doctor') return 'pending'
  return 'pending'
}

function applyDoctorStatus(
  doctorStatus: DoctorAppointmentStatus | null,
  status: AppointmentStatus,
  workflowStatus: AppointmentWorkflowStatus,
): { status: AppointmentStatus; workflow_status: AppointmentWorkflowStatus } {
  if (!doctorStatus) {
    return { status, workflow_status: workflowStatus }
  }

  switch (doctorStatus) {
    case 'pending':
      return { status: 'upcoming', workflow_status: 'pending' }
    case 'confirm':
      return { status: 'upcoming', workflow_status: 'confirmed' }
    case 'cancelled':
      return { status: 'cancelled', workflow_status: 'reject' }
    case 'done':
      return { status: 'past', workflow_status: 'confirmed' }
    case 'postponed':
      return { status: 'upcoming', workflow_status: 'confirmed' }
    default:
      return { status, workflow_status: workflowStatus }
  }
}

export function normalizeDoctorAppointment(item: RawAppointment): DoctorAppointment {
  const patient = isRecord(item.patient) ? item.patient : {}
  const user = isRecord(item.user) ? item.user : isRecord(item.booked_by) ? item.booked_by : {}
  const booker = isRecord(item.booker) ? item.booker : {}

  const doctorId = str(item.doctor_id) ?? str(item.doctorId) ?? null
  const patientId = extractPatientId(item, doctorId)
  const doctorStatus = normalizeDoctorStatus(
    item.doctor_status ?? item.doctorStatus,
  )

  let status = normalizeStatus(item.status)
  let workflow_status = normalizeWorkflow(
    item.workflow_status ?? item.workflowStatus,
  )
  const derived = applyDoctorStatus(doctorStatus, status, workflow_status)
  status = derived.status
  workflow_status = derived.workflow_status

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
    status,
    workflow_status,
    doctor_status: doctorStatus,
    doctor_id: doctorId,
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
  if (Array.isArray(payload)) {
    return payload.filter(isRecord).map(normalizeDoctorAppointment)
  }

  const source = isRecord(payload)
    ? payload.data || payload.appointments || payload.results
    : payload

  if (!Array.isArray(source)) return []
  return source.filter(isRecord).map(normalizeDoctorAppointment)
}
