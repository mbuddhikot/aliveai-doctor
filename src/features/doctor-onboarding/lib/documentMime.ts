import type { DoctorDocument } from '../types'

export function inferDocumentContentType(
  document: DoctorDocument,
  headerType: string,
): string {
  const header = headerType.trim().toLowerCase()
  if (
    header &&
    !header.includes('json') &&
    !header.includes('html') &&
    header !== 'application/octet-stream'
  ) {
    return headerType
  }

  if (document.content_type?.trim()) {
    return document.content_type.trim()
  }

  const name = document.file_name?.toLowerCase() ?? ''
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'

  return 'application/pdf'
}

export function isPdfContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes('pdf')
}

export function isImageContentType(contentType: string): boolean {
  return contentType.toLowerCase().startsWith('image/')
}
