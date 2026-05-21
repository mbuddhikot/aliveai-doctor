import { useState } from 'react'
import { AppointmentModal } from './AppointmentModal'

type ApproveAppointmentModalProps = {
  isSubmitting: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (joinUrl?: string) => void
}

export function ApproveAppointmentModal({
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ApproveAppointmentModalProps) {
  const [joinUrl, setJoinUrl] = useState('')

  return (
    <AppointmentModal
      title="Approve appointment"
      description="Confirm this booking. Add a video call link if you have one ready."
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
            disabled={isSubmitting}
            onClick={() => onConfirm(joinUrl.trim() || undefined)}
            className="h-11 rounded-[10px] bg-[#8a37ff] px-6 text-sm font-bold text-white transition hover:bg-[#772cf0] disabled:opacity-60"
          >
            {isSubmitting ? 'Approving…' : 'Approve'}
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black">
          Video join URL <span className="text-[#878787]">(optional)</span>
        </span>
        <input
          type="url"
          value={joinUrl}
          onChange={(e) => setJoinUrl(e.target.value)}
          placeholder="https://zoom.us/j/..."
          className="h-[50px] w-full rounded-[10px] border border-[#b6b6b8] px-4 text-base outline-none focus:border-[#8a37ff]"
        />
      </label>
      {error && (
        <p className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </AppointmentModal>
  )
}
