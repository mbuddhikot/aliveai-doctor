import { useEffect, useState } from 'react'
import { FiFileText, FiSave, FiTrash2 } from 'react-icons/fi'
import { AppointmentModal } from '../../appointments/components/AppointmentModal'
import type { Prescription } from '../types'

type PrescriptionModalProps = {
  mode: 'create' | 'edit'
  patientName?: string | null
  defaultDiagnosis?: string | null
  prescription?: Prescription
  isSubmitting: boolean
  isDeleting?: boolean
  error?: string | null
  onClose: () => void
  onSave: (payload: { diagnosis: string; notes: string }) => void
  onDelete?: () => void
}

function prescriptionNotes(prescription?: Prescription): string {
  if (!prescription) return ''
  if (prescription.notes?.trim()) return prescription.notes.trim()
  const first = prescription.medications[0]
  return first?.instructions?.trim() || ''
}

export function PrescriptionModal({
  mode,
  patientName,
  defaultDiagnosis,
  prescription,
  isSubmitting,
  isDeleting = false,
  error,
  onClose,
  onSave,
  onDelete,
}: PrescriptionModalProps) {
  const [diagnosis, setDiagnosis] = useState(
    prescription?.diagnosis?.trim() || defaultDiagnosis?.trim() || '',
  )
  const [notes, setNotes] = useState(prescriptionNotes(prescription))

  useEffect(() => {
    setDiagnosis(
      prescription?.diagnosis?.trim() || defaultDiagnosis?.trim() || '',
    )
    setNotes(prescriptionNotes(prescription))
  }, [prescription, defaultDiagnosis])

  const validationError =
    notes.trim().length > 0 && notes.trim().length < 3
      ? 'Prescription must be at least 3 characters.'
      : null

  const isBusy = isSubmitting || isDeleting

  return (
    <AppointmentModal
      size="lg"
      title={mode === 'create' ? 'Create prescription' : 'Edit prescription'}
      description={
        patientName
          ? `Write a prescription for ${patientName}. The patient will see this in their app.`
          : 'Write a prescription for this patient.'
      }
      onClose={onClose}
      footer={
        <>
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              disabled={isBusy}
              onClick={onDelete}
              className="mr-auto inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiTrash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="h-11 rounded-[10px] border border-[#e6e8ee] px-5 text-sm font-bold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isBusy || notes.trim().length < 3}
            onClick={() =>
              onSave({
                diagnosis: diagnosis.trim(),
                notes: notes.trim(),
              })
            }
            className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-[#8a37ff] px-6 text-sm font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiSave className="h-4 w-4" />
            {isSubmitting
              ? 'Saving…'
              : mode === 'create'
                ? 'Save prescription'
                : 'Update prescription'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-black">Diagnosis</span>
          <input
            type="text"
            maxLength={2000}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Hypertension, chest pain follow-up"
            className="h-11 w-full rounded-[10px] border border-[#b6b6b8] px-4 text-base outline-none focus:border-[#8a37ff]"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="flex items-center gap-1.5 text-sm font-medium text-black">
            <FiFileText className="h-4 w-4 text-[#8a37ff]" />
            Prescription notes
          </span>
          <div className="overflow-hidden rounded-[12px] border border-[#e6e8ee] bg-[#fffef8] shadow-inner">
            <div className="border-b border-[#f0ead6] bg-[#faf6eb] px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                Doctor&apos;s notepad
              </p>
            </div>
            <textarea
              rows={12}
              maxLength={4000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Write medications, dosage, and instructions here…

Example:
Tab. Paracetamol 500mg — 1 tablet twice daily after meals for 5 days
Tab. Amoxicillin 250mg — 1 capsule three times daily for 7 days
Rest and drink plenty of fluids.`}
              className="min-h-[280px] w-full resize-y bg-transparent px-4 py-3 font-mono text-sm leading-7 text-[#253047] outline-none placeholder:text-[#94a3b8]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(transparent, transparent 27px, #f0ead6 27px, #f0ead6 28px)',
                backgroundAttachment: 'local',
              }}
            />
            <div className="border-t border-[#f0ead6] bg-[#faf6eb] px-4 py-1.5 text-right text-xs text-[#94a3b8]">
              {notes.length}/4000
            </div>
          </div>
        </label>

        {(validationError || error) && (
          <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {validationError || error}
          </p>
        )}
      </div>
    </AppointmentModal>
  )
}