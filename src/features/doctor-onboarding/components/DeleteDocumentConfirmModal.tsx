import { FiX } from 'react-icons/fi'
import type { DoctorDocument } from '../types'
import { DOCUMENT_OPTIONS } from '../constants'

type DeleteDocumentConfirmModalProps = {
  document: DoctorDocument
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

function formatDocLabel(docType: DoctorDocument['doc_type']): string {
  return DOCUMENT_OPTIONS.find((o) => o.value === docType)?.label ?? docType
}

export function DeleteDocumentConfirmModal({
  document,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteDocumentConfirmModalProps) {
  const label = formatDocLabel(document.doc_type)
  const fileName = document.file_name?.trim() || label

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        disabled={isDeleting}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-document-modal-title"
        className="relative z-10 w-full max-w-lg rounded-[16px] border border-[#e6e8ee] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eef1f5] px-6 py-5">
          <div>
            <h2
              id="delete-document-modal-title"
              className="text-xl font-bold text-black"
            >
              Delete document?
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              This will permanently remove{' '}
              <span className="font-semibold text-black">{fileName}</span> (
              {label}) from your verification files. You can upload a new file
              afterward if needed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e6e8ee] text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff] disabled:opacity-60"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#eef1f5] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-11 cursor-pointer rounded-[10px] border border-[#e6e8ee] px-5 text-sm font-bold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-11 cursor-pointer rounded-[10px] bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
