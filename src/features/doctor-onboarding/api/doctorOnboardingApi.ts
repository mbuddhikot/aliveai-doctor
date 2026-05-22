import axios from 'axios'
import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import { DEFAULT_PROFILE_TIMEZONE } from '../constants'
import type {
  DoctorDocument,
  DoctorDocumentType,
  DoctorDocumentUploadResponse,
  DoctorProfile,
  DoctorProfileCreatePayload,
  DoctorProfileUpdatePayload,
  DoctorVerificationSummary,
} from '../types'

const PROFILE_ENDPOINT = '/v1/doctor/profile'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value != null && value !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseDoctorProfile(payload: unknown): DoctorProfile {
  const raw = isRecord(payload)
    ? isRecord(payload.data)
      ? payload.data
      : payload
    : null

  if (!raw) {
    throw new Error('Invalid doctor profile response from the API')
  }

  const verification = str(raw.verification_status) ?? 'none'
  const validStatus =
    verification === 'none' ||
    verification === 'pending' ||
    verification === 'verified' ||
    verification === 'rejected'
      ? verification
      : 'none'

  return {
    id: String(raw.id || ''),
    user_id: str(raw.user_id),
    full_name: str(raw.full_name) ?? '',
    specialty: str(raw.specialty),
    qualifications: strArray(raw.qualifications),
    registration_number: str(raw.registration_number),
    phone: str(raw.phone),
    years_experience: num(raw.years_experience),
    bio: str(raw.bio),
    fee_amount: num(raw.fee_amount),
    fee_currency: str(raw.fee_currency),
    session_minutes: num(raw.session_minutes) ?? 30,
    timezone: str(raw.timezone) ?? DEFAULT_PROFILE_TIMEZONE,
    verification_status: validStatus,
    is_active: raw.is_active !== false,
    profile_completed_at: str(raw.profile_completed_at),
    verified_at: str(raw.verified_at),
    rejection_reason: str(raw.rejection_reason),
    created_at: String(raw.created_at || new Date().toISOString()),
    updated_at: String(raw.updated_at || new Date().toISOString()),
  }
}

function normalizeDocument(doc: DoctorDocument): DoctorDocument {
  return {
    id: doc.id,
    doc_type: doc.doc_type,
    file_name: doc.file_name ?? null,
    content_type: doc.content_type ?? null,
    gcs_url: doc.gcs_url,
    uploaded_at: doc.uploaded_at,
  }
}

function toUpdatePayload(
  payload: DoctorProfileCreatePayload,
): DoctorProfileUpdatePayload {
  return {
    full_name: payload.full_name,
    specialty: payload.specialty,
    qualifications: payload.qualifications,
    registration_number: payload.registration_number,
    phone: payload.phone,
    years_experience: payload.years_experience,
    bio: payload.bio ?? null,
    fee_amount: payload.fee_amount ?? null,
    fee_currency: payload.fee_currency ?? null,
    session_minutes: payload.session_minutes ?? null,
    timezone: payload.timezone ?? DEFAULT_PROFILE_TIMEZONE,
  }
}

async function createDoctorProfile(
  payload: DoctorProfileCreatePayload,
): Promise<DoctorProfile> {
  const { data } = await apiClient.post<unknown>(PROFILE_ENDPOINT, payload, {
    validateStatus: (status) => status === 201 || status === 200,
  })
  return parseDoctorProfile(data)
}

async function updateDoctorProfile(
  payload: DoctorProfileCreatePayload,
): Promise<DoctorProfile> {
  const { data } = await apiClient.put<unknown>(
    PROFILE_ENDPOINT,
    toUpdatePayload(payload),
  )
  return parseDoctorProfile(data)
}

/** GET /v1/doctor/profile — returns null when no profile exists yet (404). */
export async function getDoctorProfile(): Promise<DoctorProfile | null> {
  try {
    const { data } = await apiClient.get<unknown>(PROFILE_ENDPOINT)
    const profile = parseDoctorProfile(data)
    if (!profile.id) return null
    return profile
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null
    }
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load doctor profile'),
      { cause: err },
    )
  }
}

/**
 * POST /v1/doctor/profile (create, 201) or PUT /v1/doctor/profile (partial update).
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/doctor-onboarding/create_doctor_profile_v1_doctor_profile_post
 */
export async function saveDoctorProfile(
  payload: DoctorProfileCreatePayload,
  profileAlreadyExists = false,
): Promise<DoctorProfile> {
  if (profileAlreadyExists) {
    try {
      return await updateDoctorProfile(payload)
    } catch (err) {
      throw new Error(
        extractApiErrorMessage(err, 'Unable to update doctor profile'),
        { cause: err },
      )
    }
  }

  try {
    return await createDoctorProfile(payload)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      return updateDoctorProfile(payload)
    }
    throw new Error(
      extractApiErrorMessage(err, 'Unable to save doctor profile'),
      { cause: err },
    )
  }
}

/** POST /v1/doctor/documents — multipart upload (file + doc_type). */
export async function uploadDoctorDocument(payload: {
  file: File
  doc_type: DoctorDocumentType
}): Promise<DoctorDocumentUploadResponse> {
  const formData = new FormData()
  formData.append('file', payload.file, payload.file.name)
  formData.append('doc_type', payload.doc_type)

  try {
    const { data } = await apiClient.post<DoctorDocumentUploadResponse>(
      '/v1/doctor/documents',
      formData,
      {
        timeout: 60_000,
      },
    )
    return data
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to upload verification document'),
      { cause: err },
    )
  }
}

/** GET /v1/doctor/verification-status */
export async function getDoctorVerificationStatus(): Promise<DoctorVerificationSummary> {
  try {
    const { data } = await apiClient.get<DoctorVerificationSummary>(
      '/v1/doctor/verification-status',
    )
    return {
      verification_status: data.verification_status || 'none',
      profile_completed: Boolean(data.profile_completed),
      documents_uploaded: data.documents_uploaded ?? 0,
      documents: (data.documents ?? []).map(normalizeDocument),
      doctor_id: data.doctor_id ?? null,
      rejection_reason: data.rejection_reason ?? null,
      verified_at: data.verified_at ?? null,
    }
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load verification status'),
      { cause: err },
    )
  }
}
