import clsx from 'clsx'
import { FiCheckCircle, FiClock, FiRefreshCw } from 'react-icons/fi'
import { STATUS_META } from '../constants'
import type { DoctorVerificationStatus } from '../types'
import { extractApiErrorMessage } from '../../../lib/apiClient'

type ReviewStepProps = {
  status: DoctorVerificationStatus
  profileCompleted: boolean
  documentsUploaded: number
  rejectionReason?: string | null
  isRefreshing: boolean
  statusError: unknown
  onRefresh: () => void
  onEditProfile: () => void
  onEditDocuments: () => void
}

export function ReviewStep({
  status,
  profileCompleted,
  documentsUploaded,
  rejectionReason,
  isRefreshing,
  statusError,
  onRefresh,
  onEditProfile,
  onEditDocuments,
}: ReviewStepProps) {
  const meta = STATUS_META[status]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-[-0.5px] text-black">
          Verification review
        </h2>
        <p className="mt-1 text-sm text-[#878787]">{meta.message}</p>
      </div>

      <div
        className={clsx(
          'flex items-start gap-4 rounded-[12px] border px-5 py-4',
          status === 'pending'
            ? 'border-amber-200 bg-amber-50'
            : status === 'rejected'
              ? 'border-red-200 bg-red-50'
              : 'border-[#e6e8ee] bg-[#fafafa]',
        )}
      >
        {status === 'pending' ? (
          <FiClock className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
        ) : (
          <FiCheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-[#8a37ff]" />
        )}
        <div>
          <span className={clsx('inline-block rounded-full px-2.5 py-1 text-xs font-bold', meta.tone)}>
            {meta.label}
          </span>
          {status === 'pending' && (
            <p className="mt-2 text-sm text-amber-900">
              We check new doctor profiles within 1–2 business days. This page
              refreshes automatically every 30 seconds.
            </p>
          )}
        </div>
      </div>

      {rejectionReason && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-bold">Rejection reason: </span>
          {rejectionReason}
        </div>
      )}

      <ul className="space-y-2">
        <ChecklistItem label="Profile submitted" done={profileCompleted} />
        <ChecklistItem
          label="Documents uploaded (license required)"
          done={documentsUploaded > 0}
          detail={`${documentsUploaded} file${documentsUploaded === 1 ? '' : 's'}`}
        />
        <ChecklistItem label="Admin approval" done={status === 'verified'} />
      </ul>

      {statusError && (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {extractApiErrorMessage(statusError, 'Unable to load status')}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isRefreshing}
          onClick={onRefresh}
          className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-[#8a37ff] px-6 text-sm font-bold text-white transition hover:bg-[#772cf0] disabled:opacity-60"
        >
          <FiRefreshCw className={clsx('h-4 w-4', isRefreshing && 'animate-spin')} />
          Refresh status
        </button>
        <button
          type="button"
          onClick={onEditProfile}
          className="h-12 rounded-[10px] border border-[#e6e8ee] bg-white px-5 text-sm font-bold text-black transition hover:border-[#8a37ff]"
        >
          Edit profile
        </button>
        <button
          type="button"
          onClick={onEditDocuments}
          className="h-12 rounded-[10px] border border-[#e6e8ee] bg-white px-5 text-sm font-bold text-black transition hover:border-[#8a37ff]"
        >
          Edit documents
        </button>
      </div>
    </div>
  )
}

function ChecklistItem({
  label,
  done,
  detail,
}: {
  label: string
  done: boolean
  detail?: string
}) {
  return (
    <li className="flex items-center justify-between rounded-[10px] border border-[#e6e8ee] bg-white px-4 py-3">
      <span className="text-sm font-medium text-black">{label}</span>
      <span
        className={clsx(
          'rounded-full px-2.5 py-1 text-xs font-bold',
          done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f1f5f9] text-[#64748b]',
        )}
      >
        {detail || (done ? 'Done' : 'Pending')}
      </span>
    </li>
  )
}
