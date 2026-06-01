import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import clsx from 'clsx'
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiFileText,
  FiTrash2,
  FiUploadCloud,
} from 'react-icons/fi'
import { DeleteDocumentConfirmModal } from './DeleteDocumentConfirmModal'
import {
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_OPTIONS,
  MAX_DOCUMENT_BYTES,
  RECOMMENDED_DOC_TYPES,
} from '../constants'
import type { DoctorDocument, DoctorDocumentType } from '../types'
import { DocumentPreviewModal } from './DocumentPreviewModal'
import {
  loadDoctorDocumentPreview,
  revokeDoctorDocumentPreview,
  type DoctorDocumentPreviewState,
} from '../lib/openDocumentPreview'
import { extractApiErrorMessage } from '../../../lib/apiClient'

type DocumentsStepProps = {
  documents: DoctorDocument[]
  isUploading: boolean
  uploadError: unknown
  onUploadBatch: (
    items: { file: File; doc_type: DoctorDocumentType }[],
    onProgress?: (current: number, total: number, docType: DoctorDocumentType) => void,
  ) => Promise<void>
  onUpdateDocument?: (params: {
    documentId: string
    file: File
    doc_type: DoctorDocumentType
  }) => Promise<void>
  onDeleteDocument?: (documentId: string) => Promise<void>
  isUpdating?: boolean
  isDeleting?: boolean
  onContinue?: () => void
  /** Hide onboarding-only “continue to review” when managing from dashboard. */
  variant?: 'onboarding' | 'dashboard'
}

type PendingFiles = Partial<Record<DoctorDocumentType, File>>

const REQUIRED_DOC_TYPE: DoctorDocumentType = 'license'

const OPTIONAL_DOC_TYPES: DoctorDocumentType[] = [
  'experience_certificate',
  'other',
]

function formatDocLabel(type: DoctorDocumentType) {
  return DOCUMENT_OPTIONS.find((o) => o.value === type)?.label ?? type
}

function formatDocHint(type: DoctorDocumentType) {
  return DOCUMENT_OPTIONS.find((o) => o.value === type)?.hint ?? ''
}

function validateFile(file: File): string | null {
  if (
    !ALLOWED_DOCUMENT_TYPES.includes(
      file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number],
    )
  ) {
    return 'Only PDF, JPG, and PNG files are supported.'
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return 'File must be under 10 MB.'
  }
  return null
}

export function DocumentsStep({
  documents,
  isUploading,
  uploadError,
  onUploadBatch,
  onUpdateDocument,
  onDeleteDocument,
  isUpdating = false,
  isDeleting = false,
  onContinue,
  variant = 'onboarding',
}: DocumentsStepProps) {
  const isDashboard = variant === 'dashboard'
  const canManageDocuments = Boolean(onUpdateDocument || onDeleteDocument)
  const isBusy = isUploading || isUpdating || isDeleting
  const [pendingFiles, setPendingFiles] = useState<PendingFiles>({})
  const [localError, setLocalError] = useState<string | null>(null)
  const [batchStatus, setBatchStatus] = useState<string | null>(null)
  const [showOptional, setShowOptional] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<DoctorDocument | null>(
    null,
  )
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [documentPreview, setDocumentPreview] =
    useState<DoctorDocumentPreviewState | null>(null)

  const documentsByType = useMemo(() => {
    const map = new Map<DoctorDocumentType, DoctorDocument[]>()
    for (const doc of documents) {
      const list = map.get(doc.doc_type) ?? []
      list.push(doc)
      map.set(doc.doc_type, list)
    }
    return map
  }, [documents])

  const uploadedTypes = useMemo(
    () => new Set(documents.map((doc) => doc.doc_type)),
    [documents],
  )

  const pendingEntries = Object.entries(pendingFiles) as [
    DoctorDocumentType,
    File,
  ][]
  const pendingCount = pendingEntries.length
  const hasLicense = uploadedTypes.has(REQUIRED_DOC_TYPE)
  const canContinue = hasLicense

  const recommendedDone = RECOMMENDED_DOC_TYPES.filter((t) =>
    uploadedTypes.has(t),
  ).length

  const setPendingForType = (type: DoctorDocumentType, file: File | null) => {
    setLocalError(null)
    setPendingFiles((current) => {
      const next = { ...current }
      if (file) next[type] = file
      else delete next[type]
      return next
    })
  }

  const handlePickFile = (type: DoctorDocumentType, file: File | undefined) => {
    if (!file) return
    const message = validateFile(file)
    if (message) {
      setLocalError(message)
      return
    }
    setPendingForType(type, file)
  }

  const clearAllPending = () => setPendingFiles({})

  const handleUploadAll = async () => {
    if (pendingCount === 0) {
      setLocalError('Select at least one file to upload.')
      return
    }

    setLocalError(null)
    setBatchStatus(null)

    try {
      const items = pendingEntries.map(([doc_type, file]) => ({
        doc_type,
        file,
      }))
      await onUploadBatch(items, (current, total, docType) => {
        setBatchStatus(
          `Uploading ${current} of ${total}: ${formatDocLabel(docType)}…`,
        )
      })
      clearAllPending()
      setBatchStatus(
        items.length === 1
          ? 'Document uploaded successfully.'
          : `${items.length} documents uploaded successfully.`,
      )
    } catch {
      /* surfaced via uploadError */
    } finally {
      setBatchStatus(null)
    }
  }

  const errorMessage =
    localError ||
    (uploadError
      ? extractApiErrorMessage(uploadError, 'Unable to upload documents')
      : null)

  const handleUpdateDocument = async (
    document: DoctorDocument,
    file: File | undefined,
  ) => {
    if (!file || !onUpdateDocument) return
    const message = validateFile(file)
    if (message) {
      setLocalError(message)
      return
    }
    setLocalError(null)
    try {
      await onUpdateDocument({
        documentId: document.id,
        file,
        doc_type: document.doc_type,
      })
      setBatchStatus(`${formatDocLabel(document.doc_type)} updated successfully.`)
    } catch {
      /* surfaced via uploadError */
    }
  }

  const handlePreviewDocument = async (document: DoctorDocument) => {
    setLocalError(null)
    setPreviewingId(document.id)
    try {
      setDocumentPreview((current) => {
        if (current) revokeDoctorDocumentPreview(current)
        return null
      })
      const preview = await loadDoctorDocumentPreview(document)
      setDocumentPreview(preview)
    } catch (err) {
      setLocalError(
        extractApiErrorMessage(err, 'Unable to open document for preview'),
      )
    } finally {
      setPreviewingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!documentToDelete || !onDeleteDocument) return
    try {
      await onDeleteDocument(documentToDelete.id)
      setDocumentToDelete(null)
      setBatchStatus('Document deleted successfully.')
    } catch {
      /* surfaced via uploadError */
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-[-0.5px] text-black">
          {isDashboard ? 'Verification documents' : 'Verification documents'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#878787]">
          {isDashboard
            ? 'Update or add credentials. Uploads are sent to our verification team.'
            : 'Add a file for each document type below. You can select several files first, then upload them together in one click.'}
        </p>
      </div>

      {!isDashboard && (
      <div className="rounded-[12px] border border-[#e6e8ee] bg-[#fafafa] px-4 py-3">
        <p className="text-sm font-semibold text-black">How this works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[#64748b]">
          <li>Choose a file for each document type you want to submit.</li>
          <li>
            Click <span className="font-semibold text-black">Upload all</span>{' '}
            — we send each file with the correct label to the verification team.
          </li>
          <li>
            When you are done, continue to review (medical license required for
            fastest approval).
          </li>
        </ol>
        <p className="mt-3 text-xs font-medium text-[#8a37ff]">
          {recommendedDone} of {RECOMMENDED_DOC_TYPES.length} recommended
          documents uploaded
          {pendingCount > 0
            ? ` · ${pendingCount} ready to upload`
            : ''}
        </p>
      </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
          Required & recommended
        </p>
        {RECOMMENDED_DOC_TYPES.map((type) => (
          <DocumentTypeSlot
            key={type}
            docType={type}
            required={type === REQUIRED_DOC_TYPE}
            uploaded={documentsByType.get(type) ?? []}
            pendingFile={pendingFiles[type]}
            disabled={isBusy}
            canManage={canManageDocuments}
            onReplaceFile={
              onUpdateDocument
                ? (document, file) => handleUpdateDocument(document, file)
                : undefined
            }
            previewingId={previewingId}
            onPreview={handlePreviewDocument}
            onPickFile={(file) => handlePickFile(type, file)}
            onClearPending={() => setPendingForType(type, null)}
          />
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowOptional((open) => !open)}
          className="flex w-full items-center justify-between rounded-[10px] border border-[#e6e8ee] bg-white px-4 py-3 text-sm font-semibold text-black transition hover:border-[#8a37ff]"
        >
          Optional documents
          {showOptional ? (
            <FiChevronUp className="h-4 w-4 text-[#64748b]" />
          ) : (
            <FiChevronDown className="h-4 w-4 text-[#64748b]" />
          )}
        </button>

        {showOptional && (
          <div className="mt-3 space-y-3">
            {OPTIONAL_DOC_TYPES.map((type) => (
              <DocumentTypeSlot
                key={type}
                docType={type}
                uploaded={documentsByType.get(type) ?? []}
                pendingFile={pendingFiles[type]}
                disabled={isBusy}
                canManage={canManageDocuments}
                onReplaceFile={
                  onUpdateDocument
                    ? (document, file) => handleUpdateDocument(document, file)
                    : undefined
                }
                previewingId={previewingId}
                onPreview={handlePreviewDocument}
                onPickFile={(file) => handlePickFile(type, file)}
                onClearPending={() => setPendingForType(type, null)}
              />
            ))}
          </div>
        )}
      </div>

      {(errorMessage || batchStatus) && (
        <p
          className={clsx(
            'rounded-[10px] border px-3 py-2 text-sm',
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800',
          )}
        >
          {errorMessage || batchStatus}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-[#eef1f5] pt-6">
        <button
          type="button"
          disabled={isBusy || pendingCount === 0}
          onClick={() => void handleUploadAll()}
          className="h-12 cursor-pointer rounded-[10px] bg-[#8a37ff] px-6 text-sm font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading
            ? 'Uploading…'
            : pendingCount > 0
              ? `Upload all (${pendingCount})`
              : 'Upload all'}
        </button>
        {pendingCount > 0 && !isBusy && (
          <button
            type="button"
            onClick={clearAllPending}
            className="h-12 cursor-pointer rounded-[10px] border border-[#e6e8ee] bg-white px-5 text-sm font-semibold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
          >
            Clear selection
          </button>
        )}
        {!isDashboard && onContinue && (
          <button
            type="button"
            disabled={!canContinue || isBusy}
            onClick={onContinue}
            className="h-12 cursor-pointer rounded-[10px] border border-[#8a37ff] bg-white px-6 text-sm font-bold text-[#8a37ff] transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to review
          </button>
        )}
      </div>

      {!isDashboard && !hasLicense && canContinue && (
        <p className="text-sm text-amber-700">
          Upload your medical license to continue. Other documents are optional but
          help speed up verification.
        </p>
      )}

      <UploadedDocumentsList
        documents={documents}
        canManage={canManageDocuments}
        isBusy={isBusy}
        previewingId={previewingId}
        onPreview={handlePreviewDocument}
        onUpdate={handleUpdateDocument}
        onRequestDelete={setDocumentToDelete}
      />

      {documentToDelete && onDeleteDocument ? (
        <DeleteDocumentConfirmModal
          document={documentToDelete}
          isDeleting={isDeleting}
          onClose={() => {
            if (!isDeleting) setDocumentToDelete(null)
          }}
          onConfirm={() => void handleConfirmDelete()}
        />
      ) : null}

      {documentPreview ? (
        <DocumentPreviewModal
          preview={documentPreview}
          onClose={() => setDocumentPreview(null)}
        />
      ) : null}
    </div>
  )
}

function DocumentTypeSlot({
  docType,
  required,
  uploaded,
  pendingFile,
  disabled,
  canManage,
  onReplaceFile,
  previewingId,
  onPreview,
  onPickFile,
  onClearPending,
}: {
  docType: DoctorDocumentType
  required?: boolean
  uploaded: DoctorDocument[]
  pendingFile?: File
  disabled?: boolean
  canManage?: boolean
  onReplaceFile?: (document: DoctorDocument, file: File) => Promise<void>
  previewingId?: string | null
  onPreview?: (document: DoctorDocument) => Promise<void>
  onPickFile: (file: File | undefined) => void
  onClearPending: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const updateInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const isUploaded = uploaded.length > 0
  const latestUpload = [...uploaded].sort(
    (a, b) =>
      new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
  )[0]

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onPickFile(event.target.files?.[0])
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    onPickFile(event.dataTransfer.files?.[0])
  }

  return (
    <div
      className={clsx(
        'rounded-[12px] border p-4 transition',
        pendingFile
          ? 'border-[#8a37ff] bg-violet-50/40'
          : isUploaded
            ? 'border-emerald-200 bg-emerald-50/30'
            : 'border-[#e6e8ee] bg-white',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-black">
              {formatDocLabel(docType)}
            </h3>
            {required && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                Required
              </span>
            )}
            {isUploaded && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <FiCheck className="h-3 w-3" />
                Uploaded
              </span>
            )}
            {pendingFile && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-[#8a37ff]">
                Ready to upload
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#878787]">{formatDocHint(docType)}</p>
        </div>
      </div>

      {isUploaded && latestUpload && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DocumentPreviewButton
            document={latestUpload}
            label={latestUpload.file_name || formatDocLabel(docType)}
            isLoading={previewingId === latestUpload.id}
            disabled={disabled}
            onPreview={onPreview}
          />
          {canManage && onReplaceFile ? (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={() => updateInputRef.current?.click()}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#dfe3ea] bg-white px-3 text-xs font-bold text-[#253047] transition hover:border-[#8a37ff] hover:text-[#8a37ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiEdit2 className="h-3.5 w-3.5" />
                Update
              </button>
              <input
                ref={updateInputRef}
                type="file"
                className="hidden"
                accept="application/pdf,image/jpeg,image/png"
                disabled={disabled}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void onReplaceFile(latestUpload, file)
                }}
              />
            </>
          ) : null}
        </div>
      )}

      <div
        className={clsx(
          'mt-3 flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-[10px] border-2 border-dashed px-4 py-5 text-center transition',
          disabled && 'pointer-events-none opacity-60',
          dragOver
            ? 'border-[#8a37ff] bg-violet-50'
            : 'border-[#d8dde6] bg-[#fbfcfe] hover:border-[#8a37ff]',
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <FiUploadCloud className="h-6 w-6 text-[#8a37ff]" />
        <p className="mt-2 text-sm font-semibold text-black">
          {pendingFile
            ? pendingFile.name
            : isUploaded
              ? 'Add another file to replace'
              : 'Drop file or click to browse'}
        </p>
        <p className="mt-1 text-xs text-[#878787]">PDF, JPG, or PNG · max 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="application/pdf,image/jpeg,image/png"
          disabled={disabled}
          onChange={onInputChange}
        />
      </div>

      {pendingFile && (
        <button
          type="button"
          disabled={disabled}
          onClick={onClearPending}
          className="mt-2 text-xs font-semibold text-[#64748b] hover:text-[#8a37ff]"
        >
          Remove selected file
        </button>
      )}
    </div>
  )
}

function DocumentPreviewButton({
  document,
  label,
  isLoading,
  disabled,
  onPreview,
}: {
  document: DoctorDocument
  label: string
  isLoading?: boolean
  disabled?: boolean
  onPreview?: (document: DoctorDocument) => Promise<void>
}) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading || !onPreview}
      onClick={() => onPreview && void onPreview(document)}
      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[8px] border border-emerald-200 bg-white px-3 py-2 text-left text-sm font-medium text-emerald-800 transition hover:border-[#8a37ff] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <FiFileText className="h-4 w-4 shrink-0 text-[#8a37ff]" />
      <span className="min-w-0 truncate">
        {isLoading ? 'Opening…' : label}
      </span>
      <span className="ml-auto shrink-0 text-xs font-semibold text-[#8a37ff]">
        {isLoading ? '' : 'View'}
      </span>
    </button>
  )
}

function UploadedDocumentsList({
  documents,
  canManage,
  isBusy,
  previewingId,
  onPreview,
  onUpdate,
  onRequestDelete,
}: {
  documents: DoctorDocument[]
  canManage?: boolean
  isBusy?: boolean
  previewingId?: string | null
  onPreview?: (document: DoctorDocument) => Promise<void>
  onUpdate?: (document: DoctorDocument, file: File | undefined) => Promise<void>
  onRequestDelete?: (document: DoctorDocument) => void
}) {
  if (documents.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-black">All uploaded documents</h3>
      <ul className="space-y-2">
        {documents.map((doc) => (
          <DocumentListRow
            key={doc.id}
            doc={doc}
            canManage={canManage}
            isBusy={isBusy}
            isPreviewLoading={previewingId === doc.id}
            onPreview={onPreview}
            onUpdate={onUpdate}
            onRequestDelete={onRequestDelete}
          />
        ))}
      </ul>
    </div>
  )
}

function DocumentListRow({
  doc,
  canManage,
  isBusy,
  isPreviewLoading,
  onPreview,
  onUpdate,
  onRequestDelete,
}: {
  doc: DoctorDocument
  canManage?: boolean
  isBusy?: boolean
  isPreviewLoading?: boolean
  onPreview?: (document: DoctorDocument) => Promise<void>
  onUpdate?: (document: DoctorDocument, file: File | undefined) => Promise<void>
  onRequestDelete?: (document: DoctorDocument) => void
}) {
  const updateInputRef = useRef<HTMLInputElement>(null)

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#e6e8ee] bg-white px-4 py-3 sm:flex-nowrap">
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <DocumentPreviewButton
          document={doc}
          label={doc.file_name || 'Document'}
          isLoading={isPreviewLoading}
          disabled={isBusy}
          onPreview={onPreview}
        />
        <span className="px-1 text-xs text-[#878787] sm:px-0">
          {formatDocLabel(doc.doc_type)} ·{' '}
          {new Date(doc.uploaded_at).toLocaleDateString()}
        </span>
      </div>
      {canManage ? (
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          {onUpdate ? (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => updateInputRef.current?.click()}
                className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border border-[#dfe3ea] bg-white px-3 text-xs font-bold text-[#253047] transition hover:border-[#8a37ff] hover:text-[#8a37ff] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              >
                <FiEdit2 className="h-3.5 w-3.5" />
                Update
              </button>
              <input
                ref={updateInputRef}
                type="file"
                className="hidden"
                accept="application/pdf,image/jpeg,image/png"
                disabled={isBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  void onUpdate(doc, file)
                }}
              />
            </>
          ) : null}
          {onRequestDelete ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onRequestDelete(doc)}
              className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border border-red-200 bg-white px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              <FiTrash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
