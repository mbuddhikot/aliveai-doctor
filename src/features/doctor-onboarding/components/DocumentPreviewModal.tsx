import { useEffect } from 'react'
import { FiDownload, FiX } from 'react-icons/fi'
import { DOCUMENT_OPTIONS } from '../constants'
import { revokeDoctorDocumentPreview } from '../lib/openDocumentPreview'
import type { DoctorDocumentPreviewState } from '../lib/openDocumentPreview'

type DocumentPreviewModalProps = {
  preview: DoctorDocumentPreviewState
  onClose: () => void
}

function formatDocLabel(docType: string): string {
  return DOCUMENT_OPTIONS.find((o) => o.value === docType)?.label ?? docType
}

export function DocumentPreviewModal({
  preview,
  onClose,
}: DocumentPreviewModalProps) {
  const { document, objectUrl, contentType, fileName, isPdf, isImage } = preview
  const docLabel = formatDocLabel(document.doc_type)

  useEffect(() => {
    return () => revokeDoctorDocumentPreview(preview)
  }, [preview])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[16px] border border-[#e6e8ee] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#eef1f5] px-5 py-4">
          <div className="min-w-0">
            <h2
              id="document-preview-title"
              className="truncate text-lg font-bold text-black"
            >
              {fileName}
            </h2>
            <p className="mt-0.5 text-sm text-[#64748b]">{docLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={objectUrl}
              download={fileName}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#dfe3ea] bg-white px-3 text-xs font-bold text-[#253047] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
            >
              <FiDownload className="h-4 w-4" />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#e6e8ee] text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#f1f5f9] p-4">
          {isPdf ? (
            <iframe
              title={fileName}
              src={objectUrl}
              className="h-[min(70vh,720px)] w-full rounded-[10px] border border-[#dfe3ea] bg-white"
            />
          ) : isImage ? (
            <img
              src={objectUrl}
              alt={fileName}
              className="mx-auto max-h-[min(70vh,720px)] max-w-full rounded-[10px] border border-[#dfe3ea] bg-white object-contain"
            />
          ) : (
            <div className="rounded-[10px] border border-[#dfe3ea] bg-white px-6 py-10 text-center">
              <p className="text-sm text-[#64748b]">
                Preview is not available for this file type (
                {contentType || 'unknown'}).
              </p>
              <a
                href={objectUrl}
                download={fileName}
                className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-[10px] bg-[#8a37ff] px-5 text-sm font-bold text-white hover:bg-[#772cf0]"
              >
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
