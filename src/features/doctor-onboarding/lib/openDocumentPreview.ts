import { downloadDoctorDocumentFile } from '../api/doctorOnboardingApi'
import { extractApiErrorMessage, getAxiosError } from '../../../lib/apiClient'
import {
  inferDocumentContentType,
  isImageContentType,
  isPdfContentType,
} from './documentMime'
import type { DoctorDocument } from '../types'

export type DoctorDocumentPreviewState = {
  document: DoctorDocument
  objectUrl: string
  contentType: string
  fileName: string
  isPdf: boolean
  isImage: boolean
  source: 'blob'
}

function formatDocumentPreviewError(err: unknown): string {
  const axErr = getAxiosError(err)
  if (axErr?.response?.status === 404) {
    return 'This document file was not found on the server. It may have been removed or not uploaded yet.'
  }
  if (axErr?.response?.status === 403) {
    return 'You do not have permission to view this document.'
  }
  if (axErr && !axErr.response) {
    return 'Unable to reach the server to load this document. Check your connection and try again.'
  }
  return extractApiErrorMessage(err, 'Unable to open document for preview')
}

function buildBlobPreview(
  document: DoctorDocument,
  blob: Blob,
  rawType: string,
): DoctorDocumentPreviewState {
  const contentType = inferDocumentContentType(document, rawType)
  const previewBlob =
    blob.type === contentType ? blob : new Blob([blob], { type: contentType })

  return {
    document,
    objectUrl: URL.createObjectURL(previewBlob),
    contentType,
    fileName: document.file_name?.trim() || 'document',
    isPdf: isPdfContentType(contentType),
    isImage: isImageContentType(contentType),
    source: 'blob',
  }
}

/** Loads preview via GET /v1/doctor/documents/{document_id}/file */
export async function loadDoctorDocumentPreview(
  document: DoctorDocument,
): Promise<DoctorDocumentPreviewState> {
  try {
    const { blob, contentType } = await downloadDoctorDocumentFile(
      document.id,
      document.gcs_url,
    )
    return buildBlobPreview(document, blob, contentType)
  } catch (err) {
    if (err instanceof Error && err.message) {
      throw err
    }
    throw new Error(formatDocumentPreviewError(err), { cause: err })
  }
}

export function revokeDoctorDocumentPreview(
  preview: DoctorDocumentPreviewState,
): void {
  URL.revokeObjectURL(preview.objectUrl)
}
