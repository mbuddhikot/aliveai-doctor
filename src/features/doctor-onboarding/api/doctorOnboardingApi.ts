import axios from 'axios'
import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import type {
  DoctorDocument,
  DoctorDocumentType,
  DoctorDocumentUploadResponse,
  DoctorProfile,
  DoctorProfilePayload,
  DoctorVerificationSummary,
} from '../types'

function normalizeDoctorProfile(data: DoctorProfile): DoctorProfile {
  return {
    ...data,
    full_name: data.full_name?.trim() ?? '',
    specialty: data.specialty?.trim() ?? null,
    qualifications: data.qualifications ?? [],
    registration_number: data.registration_number?.trim() ?? null,
    phone: data.phone?.trim() ?? null,
    bio: data.bio ?? null,
    years_experience: data.years_experience ?? null,
    fee_amount: data.fee_amount ?? null,
    fee_currency: data.fee_currency ?? null,
    session_minutes: data.session_minutes ?? 30,
    verification_status: data.verification_status || 'none',
    is_active: Boolean(data.is_active),
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

async function requestProfile(
  method: 'post' | 'put',
  payload: DoctorProfilePayload,
): Promise<DoctorProfile> {
  const { data } = await apiClient[method]<DoctorProfile>(
    '/v1/doctor/profile',
    payload,
  )
  return normalizeDoctorProfile(data)
}

/** GET /v1/doctor/profile — returns null when no profile exists yet (404). */
export async function getDoctorProfile(): Promise<DoctorProfile | null> {
  try {
    const { data } = await apiClient.get<DoctorProfile>('/v1/doctor/profile')
    return normalizeDoctorProfile(data)
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

/** POST /v1/doctor/profile (create) or PUT /v1/doctor/profile (update). */
export async function saveDoctorProfile(
  payload: DoctorProfilePayload,
  profileAlreadyExists = false,
): Promise<DoctorProfile> {
  if (profileAlreadyExists) {
    return requestProfile('put', payload)
  }

  try {
    return await requestProfile('post', payload)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      return requestProfile('put', payload)
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
