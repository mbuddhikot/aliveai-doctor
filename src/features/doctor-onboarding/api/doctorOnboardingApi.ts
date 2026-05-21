import axios from 'axios'
import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import type {
  DoctorDocumentType,
  DoctorDocumentUploadResponse,
  DoctorProfile,
  DoctorProfilePayload,
  DoctorVerificationSummary,
} from '../types'

async function requestProfile(
  method: 'post' | 'put',
  payload: DoctorProfilePayload,
): Promise<DoctorProfile> {
  const { data } = await apiClient[method]<DoctorProfile>(
    '/v1/doctor/profile',
    payload,
  )
  return data
}

/** Create or update the doctor profile (POST first, PUT on conflict). */
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

export async function getDoctorVerificationStatus(): Promise<DoctorVerificationSummary> {
  try {
    const { data } = await apiClient.get<DoctorVerificationSummary>(
      '/v1/doctor/verification-status',
    )
    return {
      verification_status: data.verification_status || 'none',
      profile_completed: Boolean(data.profile_completed),
      documents_uploaded: data.documents_uploaded || 0,
      documents: data.documents || [],
      doctor_id: data.doctor_id,
      rejection_reason: data.rejection_reason,
      verified_at: data.verified_at,
    }
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load verification status'),
      { cause: err },
    )
  }
}
