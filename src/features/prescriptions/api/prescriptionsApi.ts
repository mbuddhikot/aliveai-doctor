import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import { normalizePrescription, normalizePrescriptionList } from '../lib/normalizePrescription'
import { validatePrescriptionCreateRequest } from '../lib/validatePrescriptionCreateRequest'
import type {
  Prescription,
  PrescriptionCreateRequest,
  PrescriptionListResponse,
  UpdatePrescriptionPayload,
} from '../types'

export const DOCTOR_PRESCRIPTIONS_QUERY_KEY = 'doctor-prescriptions'
export const DOCTOR_PRESCRIPTION_QUERY_KEY = 'doctor-prescription'

export async function listDoctorPrescriptions(): Promise<PrescriptionListResponse> {
  try {
    const { data } = await apiClient.get<unknown>('/v1/doctor/prescriptions')
    const prescriptions = normalizePrescriptionList(data)
    const total =
      typeof data === 'object' &&
      data !== null &&
      'total' in data &&
      typeof (data as { total: unknown }).total === 'number'
        ? (data as { total: number }).total
        : prescriptions.length
    return {
      data: prescriptions,
      total,
    }
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load prescriptions'),
      { cause: err },
    )
  }
}

function unwrapPrescriptionPayload(data: unknown): Record<string, unknown> {
  if (!isRecord(data)) return {}
  if (isRecord(data.data)) return data.data
  return data
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Full prescription details for a visit (read-only view).
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/prescriptions/get_doctor_prescription_v1_doctor_prescriptions__prescription_id__get
 */
export async function getDoctorPrescription(
  prescriptionId: string,
): Promise<Prescription> {
  try {
    const { data } = await apiClient.get<unknown>(
      `/v1/doctor/prescriptions/${prescriptionId}`,
    )
    return normalizePrescription(unwrapPrescriptionPayload(data))
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load prescription'),
      { cause: err },
    )
  }
}

export async function createDoctorPrescription(
  payload: PrescriptionCreateRequest,
): Promise<Prescription> {
  validatePrescriptionCreateRequest(payload)

  try {
    const { data } = await apiClient.post<unknown>(
      '/v1/doctor/prescriptions',
      payload,
    )
    return normalizePrescription(
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {},
    )
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to create prescription'),
      { cause: err },
    )
  }
}

export async function updateDoctorPrescription(params: {
  prescriptionId: string
  payload: UpdatePrescriptionPayload
}): Promise<Prescription> {
  try {
    const { data } = await apiClient.put<unknown>(
      `/v1/doctor/prescriptions/${params.prescriptionId}`,
      params.payload,
    )
    return normalizePrescription(
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {},
    )
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to update prescription'),
      { cause: err },
    )
  }
}

export async function deleteDoctorPrescription(
  prescriptionId: string,
): Promise<void> {
  try {
    await apiClient.delete(`/v1/doctor/prescriptions/${prescriptionId}`)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to delete prescription'),
      { cause: err },
    )
  }
}
