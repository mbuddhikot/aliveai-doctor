import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { FiChevronRight, FiUsers } from 'react-icons/fi'
import type { DoctorPatientRecord } from '../../patients/types'
import { UserAvatar } from '../../../components/common/UserAvatar'

type DashboardPatientsStripProps = {
  patients: DoctorPatientRecord[]
  total: number
  isLoading: boolean
  className?: string
}

export function DashboardPatientsStrip({
  patients,
  total,
  isLoading,
  className,
}: DashboardPatientsStripProps) {
  return (
    <section
      className={clsx(
        'flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Your patients
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {isLoading ? '…' : `${total} total`}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">From your practice records</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3edff] text-[#8a37ff]">
          <FiUsers className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : patients.length > 0 ? (
          patients.slice(0, 6).map((patient) => (
            <div
              key={patient.user_id}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition hover:border-[#e9d5ff] hover:bg-[#faf8ff]"
            >
              <UserAvatar name={patient.name} className="h-9 w-9 shrink-0 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {patient.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {patient.appointment_count} visit
                  {patient.appointment_count === 1 ? '' : 's'}
                  {patient.email ? ` · ${patient.email}` : ''}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">No patients yet.</p>
        )}
      </div>

      <Link
        to="/dashboard/patient-records"
        className="mt-4 flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition hover:border-[#8a37ff]/40 hover:text-[#8a37ff]"
      >
        Patient records
        <FiChevronRight className="h-4 w-4" />
      </Link>
    </section>
  )
}
