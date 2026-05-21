import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import clsx from 'clsx'
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiFileText,
  FiUploadCloud,
} from 'react-icons/fi'
import {
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_OPTIONS,
  MAX_DOCUMENT_BYTES,
  RECOMMENDED_DOC_TYPES,
} from '../constants'
import type { DoctorDocument, DoctorDocumentType } from '../types'
import { extractApiErrorMessage } from '../../../lib/apiClient'

type DocumentsStepProps = {
  documents: DoctorDocument[]
  isUploading: boolean
  uploadError: unknown
  onUploadBatch: (
    items: { file: File; doc_type: DoctorDocumentType }[],
    onProgress?: (current: number, total: number, docType: DoctorDocumentType) => void,
  ) => Promise<void>
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
  onContinue,
  variant = 'onboarding',
}: DocumentsStepProps) {
  const isDashboard = variant === 'dashboard'
  const [pendingFiles, setPendingFiles] = useState<PendingFiles>({})
  const [localError, setLocalError] = useState<string | null>(null)
  const [batchStatus, setBatchStatus] = useState<string | null>(null)
  const [showOptional, setShowOptional] = useState(false)

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
            disabled={isUploading}
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
                disabled={isUploading}
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
          disabled={isUploading || pendingCount === 0}
          onClick={() => void handleUploadAll()}
          className="h-12 rounded-[10px] bg-[#8a37ff] px-6 text-sm font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading
            ? 'Uploading…'
            : pendingCount > 0
              ? `Upload all (${pendingCount})`
              : 'Upload all'}
        </button>
        {pendingCount > 0 && !isUploading && (
          <button
            type="button"
            onClick={clearAllPending}
            className="h-12 rounded-[10px] border border-[#e6e8ee] bg-white px-5 text-sm font-semibold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
          >
            Clear selection
          </button>
        )}
        {!isDashboard && onContinue && (
          <button
            type="button"
            disabled={!canContinue || isUploading}
            onClick={onContinue}
            className="h-12 rounded-[10px] border border-[#8a37ff] bg-white px-6 text-sm font-bold text-[#8a37ff] transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
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

      <UploadedDocumentsList documents={documents} />
    </div>
  )
}

function DocumentTypeSlot({
  docType,
  required,
  uploaded,
  pendingFile,
  disabled,
  onPickFile,
  onClearPending,
}: {
  docType: DoctorDocumentType
  required?: boolean
  uploaded: DoctorDocument[]
  pendingFile?: File
  disabled?: boolean
  onPickFile: (file: File | undefined) => void
  onClearPending: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const isUploaded = uploaded.length > 0
  const latestUpload = uploaded[uploaded.length - 1]

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
        <a
          href={latestUpload.gcs_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center gap-2 rounded-[8px] border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition hover:border-[#8a37ff]"
        >
          <FiFileText className="h-4 w-4 shrink-0 text-[#8a37ff]" />
          <span className="min-w-0 truncate">
            {latestUpload.file_name || formatDocLabel(docType)}
          </span>
          <span className="ml-auto shrink-0 text-xs text-[#878787]">
            {new Date(latestUpload.uploaded_at).toLocaleDateString()}
          </span>
        </a>
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

function UploadedDocumentsList({ documents }: { documents: DoctorDocument[] }) {
  if (documents.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-black">All uploaded documents</h3>
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li key={doc.id}>
            <a
              href={doc.gcs_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-[10px] border border-[#e6e8ee] bg-white px-4 py-3 transition hover:border-[#8a37ff]"
            >
              <FiFileText className="h-5 w-5 shrink-0 text-[#8a37ff]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-black">
                  {doc.file_name || 'Document'}
                </p>
                <p className="text-xs text-[#878787]">
                  {formatDocLabel(doc.doc_type)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-[#878787]">
                {new Date(doc.uploaded_at).toLocaleDateString()}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
