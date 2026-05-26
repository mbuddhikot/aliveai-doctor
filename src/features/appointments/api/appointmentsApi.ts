import { apiClient, extractApiErrorMessage, getAxiosError } from '../../../lib/apiClient'
import {
  normalizeAppointmentList,
  normalizeDoctorAppointment,
} from '../lib/normalizeAppointment'
import type {
  AppointmentListResponse,
  ApproveAppointmentPayload,
  AppointmentStatus,
  DoctorAppointment,
  DoctorAppointmentStatus,
  RejectAppointmentPayload,
  RescheduleAppointmentPayload,
} from '../types'

export const DOCTOR_APPOINTMENTS_QUERY_KEY = 'doctor-appointments'

/** Maps UI filter tab to `GET /v1/doctor/appointments` status query param. */
export type DoctorAppointmentsApiStatus = DoctorAppointmentStatus

const PATIENT_LIST_STATUSES: AppointmentStatus[] = [
  'upcoming',
  'past',
  'cancelled',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function dedupeAppointments(appointments: DoctorAppointment[]): DoctorAppointment[] {
  const byId = new Map<string, DoctorAppointment>()
  for (const item of appointments) {
    byId.set(item.id, item)
  }
  return [...byId.values()]
}

function filterForDoctor(
  appointments: DoctorAppointment[],
  doctorId: string,
): DoctorAppointment[] {
  return appointments.filter(
    (item) => !item.doctor_id || item.doctor_id === doctorId,
  )
}

function shouldUseAppointmentsFallback(err: unknown): boolean {
  const axErr = getAxiosError(err)
  if (!axErr) return true
  const status = axErr.response?.status
  if (!status) return true
  return status >= 500 || status === 404 || status === 403
}

function buildListResponse(
  data: unknown,
  appointments: DoctorAppointment[],
): AppointmentListResponse {
  const total =
    isRecord(data) && typeof data.total === 'number'
      ? data.total
      : appointments.length

  return { data: appointments, total }
}

/**
 * Primary: `GET /v1/doctor/appointments?doctor_id=…`
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/appointments/list_doctor_appointments_v1_doctor_appointments_get
 */
async function fetchDoctorAppointmentsEndpoint(params: {
  doctorId: string
  status?: DoctorAppointmentsApiStatus
}): Promise<AppointmentListResponse> {
  const { data } = await apiClient.get<unknown>('/v1/doctor/appointments', {
    params: {
      doctor_id: params.doctorId,
      ...(params.status ? { status: params.status } : {}),
    },
  })

  const appointments = normalizeAppointmentList(data)
  return buildListResponse(data, appointments)
}

/**
 * Fallback: `GET /v1/appointments?status=upcoming|past|cancelled` (required status).
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/appointments/list_appointments_v1_appointments_get
 */
async function fetchAppointmentsByStatusFallback(
  doctorId: string,
): Promise<AppointmentListResponse> {
  const responses = await Promise.all(
    PATIENT_LIST_STATUSES.map((status) =>
      apiClient.get<unknown>('/v1/appointments', { params: { status } }),
    ),
  )

  const merged = dedupeAppointments(
    responses.flatMap((response) => normalizeAppointmentList(response.data)),
  )
  const filtered = filterForDoctor(merged, doctorId)

  return { data: filtered, total: filtered.length }
}

/** Last resort when list endpoints fail — uses dashboard `recent_appointments`. */
async function fetchDashboardAppointmentsFallback(
  doctorId: string,
): Promise<AppointmentListResponse> {
  const { data } = await apiClient.get<unknown>('/v1/doctor/dashboard')
  const recent = isRecord(data)
    ? normalizeAppointmentList(
        data.recent_appointments ?? data.recentAppointments,
      )
    : []
  const filtered = filterForDoctor(recent, doctorId)
  return { data: filtered, total: filtered.length }
}

/**
 * List appointments for the logged-in doctor.
 * Tries the doctor list API first, then patient list statuses, then dashboard data.
 */
export async function listDoctorAppointments(params: {
  doctorId: string
  /** Optional: pending | confirm | cancelled | done | postponed */
  status?: DoctorAppointmentsApiStatus
}): Promise<AppointmentListResponse> {
  let primaryError: unknown

  try {
    const primary = await fetchDoctorAppointmentsEndpoint(params)
    if (primary.data.length > 0 || !params.status) {
      return primary
    }
  } catch (err) {
    primaryError = err
    if (!shouldUseAppointmentsFallback(err)) {
      throw new Error(
        extractApiErrorMessage(err, 'Unable to load appointments'),
        { cause: err },
      )
    }
  }

  try {
    const fallback = await fetchAppointmentsByStatusFallback(params.doctorId)
    if (fallback.data.length > 0) {
      return fallback
    }
  } catch {
    // try dashboard next
  }

  try {
    const dashboardFallback = await fetchDashboardAppointmentsFallback(
      params.doctorId,
    )
    if (dashboardFallback.data.length > 0) {
      return dashboardFallback
    }
  } catch {
    // surface primary error below
  }

  if (primaryError) {
    throw new Error(
      extractApiErrorMessage(primaryError, 'Unable to load appointments'),
      { cause: primaryError },
    )
  }

  return { data: [], total: 0 }
}

export async function approveDoctorAppointment(params: {
  appointmentId: string
  doctorId: string
  payload?: ApproveAppointmentPayload
}): Promise<DoctorAppointment> {
  try {
    const { data } = await apiClient.put<unknown>(
      `/v1/doctor/appointments/${params.appointmentId}/approve`,
      params.payload ?? {},
      { params: { doctor_id: params.doctorId } },
    )
    return normalizeDoctorAppointment(isRecord(data) ? data : {})
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to approve appointment'),
      { cause: err },
    )
  }
}

export async function rejectDoctorAppointment(params: {
  appointmentId: string
  doctorId: string
  payload: RejectAppointmentPayload
}): Promise<DoctorAppointment> {
  try {
    const { data } = await apiClient.put<unknown>(
      `/v1/doctor/appointments/${params.appointmentId}/reject`,
      params.payload,
      { params: { doctor_id: params.doctorId } },
    )
    return normalizeDoctorAppointment(isRecord(data) ? data : {})
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to reject appointment'),
      { cause: err },
    )
  }
}

export async function rescheduleDoctorAppointment(params: {
  appointmentId: string
  doctorId: string
  payload: RescheduleAppointmentPayload
}): Promise<DoctorAppointment> {
  try {
    const { data } = await apiClient.put<unknown>(
      `/v1/doctor/appointments/${params.appointmentId}/reschedule`,
      params.payload,
      { params: { doctor_id: params.doctorId } },
    )
    return normalizeDoctorAppointment(isRecord(data) ? data : {})
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to reschedule appointment'),
      { cause: err },
    )
  }
}

export async function fetchAppointmentPatientId(
  appointmentId: string,
  doctorId: string,
): Promise<string | null> {
  try {
    const { data } = await listDoctorAppointments({ doctorId })
    const match = data.find((item) => item.id === appointmentId)
    return match?.patient_id ?? null
  } catch {
    return null
  }
}
