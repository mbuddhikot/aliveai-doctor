import { useState } from 'react'
import { AppointmentModal } from './AppointmentModal'

type RejectAppointmentModalProps = {
  isSubmitting: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function RejectAppointmentModal({
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: RejectAppointmentModalProps) {
  const [reason, setReason] = useState('')
  const validationError =
    reason.trim().length > 0 && reason.trim().length < 2
      ? 'Reason must be at least 2 characters.'
      : null

  return (
    <AppointmentModal
      title="Reject appointment"
      description="Let the patient know why this slot cannot be confirmed."
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-11 rounded-[10px] border border-[#e6e8ee] px-5 text-sm font-bold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || reason.trim().length < 2}
            onClick={() => onConfirm(reason.trim())}
            className="h-11 rounded-[10px] bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Rejecting…' : 'Reject'}
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black">Rejection reason</span>
        <textarea
          rows={4}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. I am unavailable at this time. Please choose another slot."
          className="w-full resize-y rounded-[10px] border border-[#b6b6b8] px-4 py-3 text-base outline-none focus:border-[#8a37ff]"
        />
      </label>
      {(validationError || error) && (
        <p className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {validationError || error}
        </p>
      )}
    </AppointmentModal>
  )
}
