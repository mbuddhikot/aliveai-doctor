import clsx from 'clsx'
import { FiX } from 'react-icons/fi'
import { MODAL_TRANSITION_MS, useAnimatedModal } from '../../../lib/animatedModal'

type LogoutConfirmModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: LogoutConfirmModalProps) {
  const { mounted, visible } = useAnimatedModal(isOpen)

  if (!mounted) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className={clsx(
          'absolute inset-0 bg-black/55 transition-opacity ease-out',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDuration: `${MODAL_TRANSITION_MS}ms` }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        className={clsx(
          'relative z-10 w-full max-w-lg overflow-hidden rounded-[16px] border border-[#e6e8ee] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] transition-all ease-out',
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-3 scale-[0.98] opacity-0 sm:translate-y-2',
        )}
        style={{ transitionDuration: `${MODAL_TRANSITION_MS}ms` }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eef1f5] px-6 py-5">
          <div>
            <h2 id="logout-modal-title" className="text-xl font-bold text-black">
              Log out?
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              You will need to sign in again to access your dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e6e8ee] text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#eef1f5] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-[10px] border border-[#e6e8ee] px-5 text-sm font-bold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-[10px] bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
