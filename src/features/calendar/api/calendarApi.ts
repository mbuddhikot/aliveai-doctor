import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import type {
  AppointmentMode,
  AppointmentStatus,
  CalendarAppointment,
} from '../types'

const DOCTOR_APPOINTMENTS_ENDPOINT = '/v1/doctor/appointments'

type RawAppointment = Record<string, unknown>

function isRecord(value: unknown): value is RawAppointment {
  return typeof value === 'object' && value !== null
}

function normalizeStatus(value: unknown): AppointmentStatus {
  const status = String(value || 'confirmed').toLowerCase()
  if (
    ['confirmed', 'ongoing', 'completed', 'cancelled', 'no-show'].includes(
      status,
    )
  ) {
    return status as AppointmentStatus
  }
  return 'confirmed'
}

function normalizeMode(value: unknown): AppointmentMode {
  const mode = String(value || 'video').toLowerCase()
  if (['video', 'clinic', 'home'].includes(mode)) return mode as AppointmentMode
  return 'video'
}

function normalizeAppointment(item: RawAppointment): CalendarAppointment {
  const patient = isRecord(item.patient) ? item.patient : {}

  return {
    id: String(item.id || item.appointment_id || crypto.randomUUID()),
    patientName: String(
      item.patientName ||
        item.patient_name ||
        patient.name ||
        patient.full_name ||
        'Patient',
    ),
    patientEmail:
      typeof item.patientEmail === 'string'
        ? item.patientEmail
        : typeof item.patient_email === 'string'
          ? item.patient_email
          : typeof patient.email === 'string'
            ? patient.email
            : undefined,
    date: String(item.date || item.appointment_date || item.starts_at || '').slice(
      0,
      10,
    ),
    start: String(item.start || item.start_time || item.starts_at || '09:00').slice(
      11,
      16,
    ) || String(item.start || item.start_time || '09:00').slice(0, 5),
    end:
      String(item.end || item.end_time || item.ends_at || '').slice(11, 16) ||
      String(item.end || item.end_time || '09:30').slice(0, 5),
    status: normalizeStatus(item.status),
    mode: normalizeMode(item.mode || item.consultation_mode || item.type),
    reason: String(item.reason || item.purpose || item.title || 'Consultation'),
    notes: typeof item.notes === 'string' ? item.notes : undefined,
  }
}

function normalizeAppointments(payload: unknown): CalendarAppointment[] {
  const source = isRecord(payload)
    ? payload.data || payload.appointments || payload.results
    : payload

  if (!Array.isArray(source)) return []
  return source.filter(isRecord).map(normalizeAppointment)
}

function dateInMonth(year: number, month: number, day: number): string {
  const value = new Date(year, month, day)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(value.getDate()).padStart(2, '0')}`
}

export function createSampleAppointments(
  visibleDate = new Date(),
): CalendarAppointment[] {
  const year = visibleDate.getFullYear()
  const month = visibleDate.getMonth()

  return [
    {
      id: 'appt-001',
      patientName: 'Aarav Mehta',
      patientEmail: 'aarav.mehta@example.com',
      date: dateInMonth(year, month, 4),
      start: '09:00',
      end: '09:30',
      status: 'completed',
      mode: 'video',
      reason: 'Follow-up consultation',
      notes: 'Review medication response and sleep pattern.',
    },
    {
      id: 'appt-002',
      patientName: 'Priya Sharma',
      date: dateInMonth(year, month, 7),
      start: '11:00',
      end: '11:45',
      status: 'confirmed',
      mode: 'clinic',
      reason: 'General check-up',
    },
    {
      id: 'appt-003',
      patientName: 'Kabir Khan',
      date: dateInMonth(year, month, 7),
      start: '14:00',
      end: '14:30',
      status: 'ongoing',
      mode: 'video',
      reason: 'Lab report review',
    },
    {
      id: 'appt-004',
      patientName: 'Neha Iyer',
      date: dateInMonth(year, month, 12),
      start: '10:30',
      end: '11:00',
      status: 'cancelled',
      mode: 'home',
      reason: 'Home visit',
    },
    {
      id: 'appt-005',
      patientName: 'Rohan Gupta',
      date: dateInMonth(year, month, 18),
      start: '16:00',
      end: '16:30',
      status: 'confirmed',
      mode: 'video',
      reason: 'New patient consultation',
    },
    {
      id: 'appt-006',
      patientName: 'Maya Nair',
      date: dateInMonth(year, month, 22),
      start: '09:30',
      end: '10:00',
      status: 'no-show',
      mode: 'clinic',
      reason: 'Routine check-in',
    },
  ]
}

export async function getBookedAppointments(): Promise<CalendarAppointment[]> {
  try {
    const { data } = await apiClient.get<unknown>(DOCTOR_APPOINTMENTS_ENDPOINT)
    return normalizeAppointments(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load booked appointments'),
      { cause: err },
    )
  }
}
