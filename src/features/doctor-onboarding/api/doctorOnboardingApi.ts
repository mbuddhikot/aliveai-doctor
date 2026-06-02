import axios from 'axios'
import { readTokenFromStorage } from '../../auth/utils/storage'
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
  DoctorVerificationStatus,
} from '../types'

const PROFILE_ENDPOINT = '/v1/doctor/profile'
const DOCUMENTS_ENDPOINT = '/v1/doctor/documents'
const VERIFICATION_STATUS_ENDPOINT = '/v1/doctor/verification-status'

const DOCUMENT_TYPES: DoctorDocumentType[] = [
  'degree',
  'experience_certificate',
  'id_proof',
  'license',
  'other',
]

const VERIFICATION_STATUSES: DoctorVerificationStatus[] = [
  'none',
  'pending',
  'verified',
  'rejected',
]

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

function parseVerificationStatus(value: unknown): DoctorVerificationStatus {
  const verification = str(value) ?? 'none'
  return VERIFICATION_STATUSES.includes(verification as DoctorVerificationStatus)
    ? (verification as DoctorVerificationStatus)
    : 'none'
}

function parseDoctorDocument(raw: unknown): DoctorDocument | null {
  if (!isRecord(raw)) return null

  const docType = str(raw.doc_type)
  if (!docType || !DOCUMENT_TYPES.includes(docType as DoctorDocumentType)) {
    return null
  }

  const gcsUrl = str(raw.gcs_url)
  if (!gcsUrl) return null

  return {
    id: String(raw.id || ''),
    doc_type: docType as DoctorDocumentType,
    file_name: str(raw.file_name),
    content_type: str(raw.content_type),
    gcs_url: gcsUrl,
    uploaded_at: String(raw.uploaded_at || new Date().toISOString()),
  }
}

function parseDoctorDocuments(value: unknown): DoctorDocument[] {
  if (!Array.isArray(value)) return []
  return value
    .map(parseDoctorDocument)
    .filter((doc): doc is DoctorDocument => doc !== null)
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
    verification_status: parseVerificationStatus(raw.verification_status),
    is_active: raw.is_active !== false,
    profile_completed_at: str(raw.profile_completed_at),
    verified_at: str(raw.verified_at),
    rejection_reason: str(raw.rejection_reason),
    documents: parseDoctorDocuments(raw.documents),
    created_at: String(raw.created_at || new Date().toISOString()),
    updated_at: String(raw.updated_at || new Date().toISOString()),
  }
}

function parseDocumentUploadResponse(
  payload: unknown,
): DoctorDocumentUploadResponse {
  const raw = isRecord(payload)
    ? isRecord(payload.data)
      ? payload.data
      : payload
    : null

  const doc = raw ? parseDoctorDocument(raw) : null
  if (!doc) {
    throw new Error('Invalid document upload response from the API')
  }

  return {
    id: doc.id,
    doc_type: doc.doc_type,
    gcs_url: doc.gcs_url,
    uploaded_at: doc.uploaded_at,
  }
}

function toUpdatePayload(
  payload: DoctorProfileCreatePayload,
): DoctorProfileUpdatePayload {
  return {
    full_name: payload.full_name,
    phone: payload.phone,
    years_experience: payload.years_experience,
    bio: payload.bio ?? null,
    fee_amount: payload.fee_amount ?? null,
    fee_currency: payload.fee_currency ?? null,
    session_minutes: payload.session_minutes ?? null,
    timezone: payload.timezone ?? DEFAULT_PROFILE_TIMEZONE,
  }
}

function buildDocumentFormData(payload: {
  file: File
  doc_type: DoctorDocumentType
}): FormData {
  const formData = new FormData()
  formData.append('file', payload.file, payload.file.name)
  formData.append('doc_type', payload.doc_type)
  return formData
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
  try {
    const { data } = await apiClient.post<unknown>(
      DOCUMENTS_ENDPOINT,
      buildDocumentFormData(payload),
      { timeout: 60_000 },
    )
    return parseDocumentUploadResponse(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to upload verification document'),
      { cause: err },
    )
  }
}

/** PUT /v1/doctor/documents/{document_id} — replace file and/or doc_type. */
export async function updateDoctorDocument(params: {
  documentId: string
  file: File
  doc_type: DoctorDocumentType
}): Promise<DoctorDocumentUploadResponse> {
  try {
    const { data } = await apiClient.put<unknown>(
      `${DOCUMENTS_ENDPOINT}/${params.documentId}`,
      buildDocumentFormData({
        file: params.file,
        doc_type: params.doc_type,
      }),
      { timeout: 60_000 },
    )
    return parseDocumentUploadResponse(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to update verification document'),
      { cause: err },
    )
  }
}

function contentTypeFromHeaders(
  headers: Record<string, unknown>,
  blob: Blob,
): string {
  const raw = headers['content-type'] ?? headers['Content-Type']
  if (typeof raw === 'string' && raw.trim()) return raw
  if (blob.type && blob.type !== 'application/octet-stream') return blob.type
  return 'application/octet-stream'
}

function isLikelySignedStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const query = parsed.search.toLowerCase()
    return (
      query.includes('x-goog-') ||
      query.includes('signature') ||
      query.includes('token=') ||
      query.includes('expires=')
    )
  } catch {
    return false
  }
}

async function parseBlobError(blob: Blob): Promise<string | null> {
  const type = blob.type.toLowerCase()
  if (!type.includes('json') && !type.includes('html') && !type.includes('text')) {
    return null
  }
  try {
    const text = (await blob.text()).trim()
    if (!text) return 'Document file is empty.'
    if (text.startsWith('{') || text.startsWith('[')) {
      const json = JSON.parse(text) as {
        detail?: string | { msg?: string }[]
        message?: string
      }
      if (typeof json.detail === 'string') return json.detail
      if (Array.isArray(json.detail)) {
        const msg = json.detail
          .map((item) => item?.msg)
          .filter(Boolean)
          .join(' · ')
        if (msg) return msg
      }
      if (json.message) return json.message
      return 'Unable to load document file.'
    }
    if (type.includes('html') || text.startsWith('<')) {
      return 'Unable to access document storage. The file link may have expired.'
    }
    return text.length < 200 ? text : 'Unable to load document file.'
  } catch {
    return 'Unable to load document file.'
  }
}

async function ensureValidFileBlob(
  blob: Blob,
  contentType: string,
): Promise<{ blob: Blob; contentType: string }> {
  if (blob.size === 0) {
    throw new Error('Document file is empty.')
  }

  const type = contentType.toLowerCase()
  if (
    type.includes('json') ||
    type.includes('html') ||
    (type.includes('text') && !type.includes('pdf'))
  ) {
    const message = await parseBlobError(blob)
    throw new Error(message ?? 'Unable to load document file.')
  }

  return { blob, contentType }
}

/** @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/doctor-onboarding/view_doctor_document_file_v1_doctor_documents__document_id__file_get */
export function doctorDocumentFilePath(documentId: string): string {
  return `${DOCUMENTS_ENDPOINT}/${documentId}/file`
}

async function downloadDocumentFileFromApiPath(
  path: string,
): Promise<{ blob: Blob; contentType: string }> {
  const { data, headers } = await apiClient.get<Blob>(path, {
    responseType: 'blob',
    timeout: 60_000,
    headers: {
      Accept: 'application/octet-stream, application/pdf, image/*, */*',
    },
  })
  const contentType = contentTypeFromHeaders(headers, data)
  return ensureValidFileBlob(data, contentType)
}

async function downloadDocumentFileFromStorageUrl(
  gcsUrl: string,
  withAuth: boolean,
): Promise<{ blob: Blob; contentType: string }> {
  const token = withAuth ? readTokenFromStorage() : null
  const { data, headers } = await axios.get<Blob>(gcsUrl, {
    responseType: 'blob',
    timeout: 60_000,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const contentType = contentTypeFromHeaders(headers, data)
  return ensureValidFileBlob(data, contentType)
}

function shouldTryNextDownload(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  return status === 404 || status === 405 || status === 403
}

function formatDocumentDownloadError(err: unknown): string {
  const axErr = axios.isAxiosError(err) ? err : null
  if (axErr?.response?.status === 404) {
    return 'Document file not found on the server (404).'
  }
  if (axErr && !axErr.response) {
    return 'Unable to fetch the file from cloud storage (blocked by network or CORS).'
  }
  return extractApiErrorMessage(err, 'Unable to download document file')
}

/**
 * Download a doctor verification document for in-app preview.
 * Primary: GET /v1/doctor/documents/{document_id}/file
 */
export async function downloadDoctorDocumentFile(
  documentId: string,
  gcsUrl?: string | null,
): Promise<{ blob: Blob; contentType: string }> {
  const storageUrl = gcsUrl?.trim()
  let lastError: unknown

  try {
    return await downloadDocumentFileFromApiPath(doctorDocumentFilePath(documentId))
  } catch (err) {
    lastError = err
    if (!shouldTryNextDownload(err)) {
      throw new Error(formatDocumentDownloadError(err), { cause: err })
    }
  }

  try {
    return await downloadDocumentFileFromApiPath(`/v1/documents/${documentId}/file`)
  } catch (err) {
    lastError = err
    if (!shouldTryNextDownload(err)) {
      throw new Error(formatDocumentDownloadError(err), { cause: err })
    }
  }

  if (storageUrl?.startsWith('https://') || storageUrl?.startsWith('http://')) {
    const withAuth =
      isLikelySignedStorageUrl(storageUrl) ||
      storageUrl.includes('storage.googleapis.com')

    try {
      return await downloadDocumentFileFromStorageUrl(storageUrl, withAuth)
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(formatDocumentDownloadError(lastError), { cause: lastError })
}

/** DELETE /v1/doctor/documents/{document_id} */
export async function deleteDoctorDocument(documentId: string): Promise<void> {
  try {
    await apiClient.delete(`${DOCUMENTS_ENDPOINT}/${documentId}`)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to delete verification document'),
      { cause: err },
    )
  }
}

/** GET /v1/doctor/verification-status */
export async function getDoctorVerificationStatus(): Promise<DoctorVerificationSummary> {
  try {
    const { data } = await apiClient.get<unknown>(VERIFICATION_STATUS_ENDPOINT)
    const raw = isRecord(data)
      ? isRecord(data.data)
        ? data.data
        : data
      : {}

    return {
      verification_status: parseVerificationStatus(raw.verification_status),
      profile_completed: raw.profile_completed === true,
      documents_uploaded: num(raw.documents_uploaded) ?? 0,
      documents: parseDoctorDocuments(raw.documents),
      doctor_id: str(raw.doctor_id),
      rejection_reason: str(raw.rejection_reason),
      verified_at: str(raw.verified_at),
    }
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load verification status'),
      { cause: err },
    )
  }
}
