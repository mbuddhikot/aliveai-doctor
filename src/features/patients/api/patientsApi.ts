import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import type { DoctorPatientListResponse, DoctorPatientRecord } from '../types'

export const DOCTOR_PATIENTS_QUERY_KEY = 'doctor-patients'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function normalizePatientRecord(item: Record<string, unknown>): DoctorPatientRecord {
  const first = str(item.first_name) ?? str(item.firstName)
  const last = str(item.last_name) ?? str(item.lastName)
  const name =
    str(item.name) ||
    str(item.patient_name) ||
    str(item.patientName) ||
    [first, last].filter(Boolean).join(' ') ||
    'Patient'

  return {
    user_id:
      str(item.user_id) ??
      str(item.userId) ??
      str(item.patient_user_id) ??
      str(item.patient_id) ??
      '',
    email: str(item.email) ?? str(item.patient_email) ?? '',
    name,
    first_name: first ?? null,
    last_name: last ?? null,
    mobile_number: str(item.mobile_number) ?? str(item.mobileNumber) ?? null,
    appointment_count:
      Number(item.appointment_count ?? item.appointmentCount ?? 0) || 0,
    last_appointment_at: String(
      item.last_appointment_at ?? item.lastAppointmentAt ?? '',
    ),
  }
}

export function normalizeDoctorPatientList(data: unknown): DoctorPatientListResponse {
  const root = isRecord(data) ? data : {}
  const source = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.patients)
      ? root.patients
      : []

  const patients = source.filter(isRecord).map(normalizePatientRecord)

  return {
    data: patients,
    total: typeof root.total === 'number' ? root.total : patients.length,
    limit: typeof root.limit === 'number' ? root.limit : patients.length,
    offset: typeof root.offset === 'number' ? root.offset : 0,
  }
}

/**
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/doctor-dashboard/list_doctor_patients_v1_doctor_patients_get
 */
export async function listDoctorPatients(params?: {
  q?: string
  limit?: number
  offset?: number
}): Promise<DoctorPatientListResponse> {
  try {
    const { data } = await apiClient.get<unknown>('/v1/doctor/patients', {
      params: {
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
        ...(params?.q?.trim() ? { q: params.q.trim() } : {}),
      },
    })
    return normalizeDoctorPatientList(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load patients'),
      { cause: err },
    )
  }
}
