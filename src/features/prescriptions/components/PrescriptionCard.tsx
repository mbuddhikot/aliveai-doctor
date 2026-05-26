import { DateTime } from 'luxon'
import { FiEdit2, FiFileText } from 'react-icons/fi'
import type { Prescription } from '../types'

type PrescriptionCardProps = {
  prescription: Prescription
  onEdit: () => void
}

function formatDate(iso: string): string {
  const dt = DateTime.fromISO(iso)
  return dt.isValid ? dt.toFormat('MMM d, yyyy · h:mm a') : iso
}

function displayText(prescription: Prescription): string {
  if (prescription.notes?.trim()) return prescription.notes.trim()
  const first = prescription.medications[0]
  return first?.instructions?.trim() || 'No notes'
}

export function PrescriptionCard({ prescription, onEdit }: PrescriptionCardProps) {
  const preview = displayText(prescription)
  const truncated =
    preview.length > 160 ? `${preview.slice(0, 160).trim()}…` : preview

  return (
    <article className="rounded-[10px] border border-[#e6e8ee] bg-[#fffef8] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#8a37ff]">
            <FiFileText className="h-3.5 w-3.5" />
            Prescription
          </div>
          {prescription.diagnosis ? (
            <p className="mt-1 text-sm font-semibold text-[#111827]">
              {prescription.diagnosis}
            </p>
          ) : null}
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#475569]">
            {truncated}
          </p>
          <p className="mt-2 text-xs text-[#94a3b8]">
            {formatDate(prescription.created_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] border border-[#dfe3ea] bg-white px-2.5 text-xs font-bold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
        >
          <FiEdit2 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
    </article>
  )
}
