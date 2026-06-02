import { apiClient, extractApiErrorMessage, getAxiosError } from '../../../lib/apiClient'
import { doctorLocalWallClockToUtcIso } from '../../../lib/doctorTimezone'
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
  fallbackLimit: number,
  fallbackOffset: number,
): AppointmentListResponse {
  const root = isRecord(data) ? data : {}
  const total =
    typeof root.total === 'number' ? root.total : appointments.length
  const limit =
    typeof root.limit === 'number' ? root.limit : fallbackLimit
  const offset =
    typeof root.offset === 'number' ? root.offset : fallbackOffset

  return { data: appointments, total, limit, offset }
}

/**
 * Primary: `GET /v1/doctor/appointments?doctor_id=…`
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/appointments/list_doctor_appointments_v1_doctor_appointments_get
 */
async function fetchDoctorAppointmentsEndpoint(params: {
  doctorId: string
  status?: DoctorAppointmentsApiStatus
  q?: string
  limit?: number
  offset?: number
}): Promise<AppointmentListResponse> {
  const limit = params.limit ?? 20
  const offset = params.offset ?? 0

  const { data } = await apiClient.get<unknown>('/v1/doctor/appointments', {
    params: {
      doctor_id: params.doctorId,
      limit,
      offset,
      ...(params.status ? { status: params.status } : {}),
      ...(params.q?.trim() ? { q: params.q.trim() } : {}),
    },
  })

  const appointments = normalizeAppointmentList(data)
  return buildListResponse(data, appointments, limit, offset)
}

async function fetchAllDoctorAppointmentsPages(
  doctorId: string,
): Promise<AppointmentListResponse> {
  const pageSize = 200
  let offset = 0
  let total = 0
  const merged: DoctorAppointment[] = []

  while (true) {
    const page = await fetchDoctorAppointmentsEndpoint({
      doctorId,
      limit: pageSize,
      offset,
    })
    merged.push(...page.data)
    total = page.total
    offset += page.data.length
    if (page.data.length === 0 || offset >= total) break
  }

  return {
    data: dedupeAppointments(merged),
    total,
    limit: merged.length,
    offset: 0,
  }
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

  return {
    data: filtered,
    total: filtered.length,
    limit: filtered.length,
    offset: 0,
  }
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
  return {
    data: filtered,
    total: filtered.length,
    limit: filtered.length,
    offset: 0,
  }
}

export const DOCTOR_APPOINTMENTS_PAGE_SIZE = 10

/**
 * Paginated list for My Appointments — `GET /v1/doctor/appointments` only.
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/appointments/list_doctor_appointments_v1_doctor_appointments_get
 */
export async function listDoctorAppointmentsPaginated(params: {
  doctorId: string
  status?: DoctorAppointmentsApiStatus
  q?: string
  limit?: number
  offset?: number
}): Promise<AppointmentListResponse> {
  try {
    return await fetchDoctorAppointmentsEndpoint({
      doctorId: params.doctorId,
      status: params.status,
      q: params.q,
      limit: params.limit ?? DOCTOR_APPOINTMENTS_PAGE_SIZE,
      offset: params.offset ?? 0,
    })
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load appointments'),
      { cause: err },
    )
  }
}

/**
 * Full list for calendar / patient records (fetches all pages from doctor API).
 */
export async function listDoctorAppointments(params: {
  doctorId: string
  status?: DoctorAppointmentsApiStatus
}): Promise<AppointmentListResponse> {
  let primaryError: unknown

  try {
    return await fetchAllDoctorAppointmentsPages(params.doctorId)
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

  return { data: [], total: 0, limit: 0, offset: 0 }
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
  doctorTimezone: string
  payload: RescheduleAppointmentPayload
}): Promise<DoctorAppointment> {
  const startsAt = doctorLocalWallClockToUtcIso(
    params.payload.date,
    params.payload.time,
    params.doctorTimezone,
  )
  if (!startsAt) {
    throw new Error('Invalid date or time for reschedule.')
  }

  try {
    const { data } = await apiClient.put<unknown>(
      `/v1/doctor/appointments/${params.appointmentId}/reschedule`,
      {
        starts_at: startsAt,
        duration_minutes: params.payload.duration_minutes ?? null,
      },
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
