import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { DateTime } from 'luxon'
import { FiFileText } from 'react-icons/fi'
import { AppointmentModal } from '../../appointments/components/AppointmentModal'
import {
  DOCTOR_PRESCRIPTION_QUERY_KEY,
  getDoctorPrescription,
} from '../api/prescriptionsApi'
import { extractApiErrorMessage } from '../../../lib/apiClient'
import type { MedicationItem, Prescription } from '../types'

type PrescriptionViewModalProps = {
  prescriptionIds: string[]
  patientName?: string | null
  visitLabel?: string | null
  onClose: () => void
}

function formatDate(iso: string): string {
  const dt = DateTime.fromISO(iso)
  return dt.isValid ? dt.toFormat('MMM d, yyyy · h:mm a') : iso
}

function MedicationList({ items }: { items: MedicationItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500">No medications listed.</p>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((med, index) => (
        <li
          key={`${med.name}-${index}`}
          className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm"
        >
          <p className="font-semibold text-slate-900">{med.name}</p>
          <dl className="mt-1 grid gap-0.5 text-xs text-slate-600">
            {med.dose && (
              <div className="flex gap-2">
                <dt className="font-medium text-slate-500">Dose</dt>
                <dd>{med.dose}</dd>
              </div>
            )}
            {med.frequency && (
              <div className="flex gap-2">
                <dt className="font-medium text-slate-500">Frequency</dt>
                <dd>{med.frequency}</dd>
              </div>
            )}
            {med.duration_days != null && (
              <div className="flex gap-2">
                <dt className="font-medium text-slate-500">Duration</dt>
                <dd>{med.duration_days} days</dd>
              </div>
            )}
            {med.instructions && (
              <div className="mt-1 text-slate-700">{med.instructions}</div>
            )}
          </dl>
        </li>
      ))}
    </ul>
  )
}

function PrescriptionDetail({ prescription }: { prescription: Prescription }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={clsx(
            'rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
            prescription.status === 'active'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
              : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
          )}
        >
          {prescription.status}
        </span>
        <span className="text-xs text-slate-500">
          Issued {formatDate(prescription.created_at)}
        </span>
      </div>

      {prescription.diagnosis && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Diagnosis
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {prescription.diagnosis}
          </p>
        </div>
      )}

      {prescription.notes?.trim() && (
        <div className="rounded-xl border border-[#e9d5ff] bg-[#faf8ff] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8a37ff]">
            Clinical notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {prescription.notes.trim()}
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Medications
        </p>
        <MedicationList items={prescription.medications} />
      </div>
    </div>
  )
}

export function PrescriptionViewModal({
  prescriptionIds,
  patientName,
  visitLabel,
  onClose,
}: PrescriptionViewModalProps) {
  const [activeId, setActiveId] = useState(prescriptionIds[0] ?? '')

  useEffect(() => {
    setActiveId(prescriptionIds[0] ?? '')
  }, [prescriptionIds])

  const prescriptionQuery = useQuery({
    queryKey: [DOCTOR_PRESCRIPTION_QUERY_KEY, activeId],
    queryFn: () => getDoctorPrescription(activeId),
    enabled: Boolean(activeId),
  })

  const title = patientName
    ? `Prescription · ${patientName}`
    : 'Prescription details'

  const description = [
    visitLabel,
    prescriptionIds.length > 1
      ? `${prescriptionIds.length} prescriptions for this visit`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <AppointmentModal
      size="lg"
      title={title}
      description={description || undefined}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center rounded-[10px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-[#8a37ff]/40 hover:text-[#8a37ff]"
        >
          Close
        </button>
      }
    >
      {prescriptionIds.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {prescriptionIds.map((id, index) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveId(id)}
              className={clsx(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition',
                activeId === id
                  ? 'bg-[#8a37ff] text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#8a37ff]/40',
              )}
            >
              <FiFileText className="h-3.5 w-3.5" />
              Prescription {index + 1}
            </button>
          ))}
        </div>
      )}

      {prescriptionQuery.isLoading && (
        <p className="py-8 text-center text-sm text-slate-500">
          Loading prescription…
        </p>
      )}

      {prescriptionQuery.isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {extractApiErrorMessage(
            prescriptionQuery.error,
            'Unable to load prescription',
          )}
        </p>
      )}

      {prescriptionQuery.isSuccess && prescriptionQuery.data && (
        <PrescriptionDetail prescription={prescriptionQuery.data} />
      )}
    </AppointmentModal>
  )
}
