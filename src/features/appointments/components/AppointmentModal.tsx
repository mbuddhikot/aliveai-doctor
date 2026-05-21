import type { ReactNode } from 'react'
import { FiX } from 'react-icons/fi'

type AppointmentModalProps = {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}

export function AppointmentModal({
  title,
  description,
  children,
  onClose,
  footer,
}: AppointmentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-modal-title"
        className="relative z-10 w-full max-w-lg rounded-[16px] border border-[#e6e8ee] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eef1f5] px-6 py-5">
          <div>
            <h2
              id="appointment-modal-title"
              className="text-xl font-bold text-black"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[#64748b]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e6e8ee] text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-3 border-t border-[#eef1f5] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
