import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import { normalizeAppointmentList } from '../../appointments/lib/normalizeAppointment'
import type {
  AppointmentStartResponse,
  DoctorAnalyticsResponse,
  DoctorDashboardResponse,
} from '../types'

export const DOCTOR_DASHBOARD_QUERY_KEY = 'doctor-dashboard'
export const DOCTOR_ANALYTICS_QUERY_KEY = 'doctor-analytics'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

export function normalizeDoctorDashboard(data: unknown): DoctorDashboardResponse {
  const root = isRecord(data) ? data : {}
  const doctor = isRecord(root.doctor) ? root.doctor : {}
  const today = isRecord(root.today) ? root.today : {}
  const queues = isRecord(root.queues) ? root.queues : {}
  const recent = normalizeAppointmentList(
    isRecord(root) ? root.recent_appointments ?? root.recentAppointments : [],
  )
  const nextRaw = today.next_appointment ?? today.nextAppointment
  const nextList = nextRaw
    ? normalizeAppointmentList(isRecord(nextRaw) ? [nextRaw] : nextRaw)
    : []

  return {
    doctor: {
      id: String(doctor.id || ''),
      full_name: str(doctor.full_name) || str(doctor.fullName) || 'Doctor',
      specialty: str(doctor.specialty) ?? null,
      verification_status: String(
        doctor.verification_status || doctor.verificationStatus || '',
      ),
      is_active: Boolean(doctor.is_active ?? doctor.isActive ?? true),
    },
    today: {
      date: String(today.date || ''),
      appointment_count: Number(today.appointment_count ?? today.appointmentCount ?? 0) || 0,
      next_appointment: nextList[0] ?? null,
    },
    queues: {
      pending_approval:
        Number(queues.pending_approval ?? queues.pendingApproval ?? 0) || 0,
      upcoming_7d: Number(queues.upcoming_7d ?? queues.upcoming7d ?? 0) || 0,
      confirmed_total:
        Number(queues.confirmed_total ?? queues.confirmedTotal ?? 0) || 0,
    },
    recent_appointments: recent,
  }
}

export function normalizeDoctorAnalytics(data: unknown): DoctorAnalyticsResponse {
  const root = isRecord(data) ? data : {}
  const range = isRecord(root.range) ? root.range : {}
  const totals = isRecord(root.totals) ? root.totals : {}
  const revenue = isRecord(root.revenue) ? root.revenue : {}
  const topIssues = Array.isArray(root.top_issues)
    ? root.top_issues
    : Array.isArray(root.topIssues)
      ? root.topIssues
      : []
  const perDay = Array.isArray(root.per_day)
    ? root.per_day
    : Array.isArray(root.perDay)
      ? root.perDay
      : []

  return {
    range: {
      from: String(range.from || ''),
      to: String(range.to || ''),
    },
    totals: {
      appointments_total: Number(totals.appointments_total ?? totals.appointmentsTotal ?? 0) || 0,
      pending: Number(totals.pending ?? 0) || 0,
      confirmed: Number(totals.confirmed ?? 0) || 0,
      in_progress: Number(totals.in_progress ?? totals.inProgress ?? 0) || 0,
      completed: Number(totals.completed ?? 0) || 0,
      cancelled: Number(totals.cancelled ?? 0) || 0,
      rejected: Number(totals.rejected ?? 0) || 0,
    },
    revenue: {
      currency: str(revenue.currency) || 'USD',
      amount: Number(revenue.amount ?? 0) || 0,
    },
    top_issues: topIssues
      .filter(isRecord)
      .map((item) => ({
        issue: str(item.issue) || 'Other',
        count: Number(item.count ?? 0) || 0,
      })),
    per_day: perDay
      .filter(isRecord)
      .map((item) => ({
        date: String(item.date || ''),
        count: Number(item.count ?? 0) || 0,
      })),
  }
}

export async function getDoctorDashboard(): Promise<DoctorDashboardResponse> {
  try {
    const { data } = await apiClient.get<unknown>('/v1/doctor/dashboard')
    return normalizeDoctorDashboard(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load dashboard'),
      { cause: err },
    )
  }
}

export async function getDoctorAnalytics(params?: {
  from?: string
  to?: string
}): Promise<DoctorAnalyticsResponse> {
  try {
    const { data } = await apiClient.get<unknown>('/v1/doctor/analytics', {
      params: {
        ...(params?.from ? { from: params.from } : {}),
        ...(params?.to ? { to: params.to } : {}),
      },
    })
    return normalizeDoctorAnalytics(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load analytics'),
      { cause: err },
    )
  }
}

export async function startDoctorAppointment(
  appointmentId: string,
): Promise<AppointmentStartResponse> {
  try {
    const { data } = await apiClient.post<unknown>(
      `/v1/doctor/appointments/${appointmentId}/start`,
    )
    const root = isRecord(data) ? data : {}
    return {
      appointment_id: String(root.appointment_id || root.appointmentId || appointmentId),
      status: String(root.status || 'in_progress'),
      started_at: String(root.started_at || root.startedAt || new Date().toISOString()),
      join_url: str(root.join_url) ?? str(root.joinUrl) ?? null,
      duration_minutes: Number(root.duration_minutes ?? root.durationMinutes ?? 30) || 30,
    }
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to start appointment'),
      { cause: err },
    )
  }
}
