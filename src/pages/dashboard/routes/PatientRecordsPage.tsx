import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  FiAlertCircle,
  FiCalendar,
  FiClock,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiUsers,
} from 'react-icons/fi'
import { UserAvatar } from '../../../components/common/UserAvatar'
import {
  DOCTOR_APPOINTMENTS_QUERY_KEY,
  listDoctorAppointments,
} from '../../../features/appointments/api/appointmentsApi'
import {
  shouldShowAppointmentStatusBadge,
  StatusBadge,
  WorkflowBadge,
} from '../../../features/appointments/components/AppointmentBadges'
import {
  appointmentDoctorTimezone,
  formatAppointmentDateTime,
  formatAppointmentTimeRange,
  formatFee,
} from '../../../features/appointments/lib/format'
import { useDoctorTimezone } from '../../../features/appointments/hooks/useDoctorTimezone'
import type { DoctorAppointment } from '../../../features/appointments/types'
import { useDoctorId } from '../../../features/appointments/hooks/useDoctorId'
import {
  buildPatientDirectory,
  filterPatients,
} from '../../../features/patients/lib/buildPatientDirectory'
import { buildManageAppointmentsPath } from '../../../features/patients/lib/resolveManageAppointment'
import type { PatientSummary } from '../../../features/patients/types'
import {
  DOCTOR_PRESCRIPTIONS_QUERY_KEY,
  listDoctorPrescriptions,
} from '../../../features/prescriptions/api/prescriptionsApi'
import { PrescriptionViewModal } from '../../../features/prescriptions/components/PrescriptionViewModal'
import { findPrescriptionsForVisit } from '../../../features/prescriptions/lib/findPrescriptionsForVisit'
import type { Prescription } from '../../../features/prescriptions/types'
import { extractApiErrorMessage } from '../../../lib/apiClient'

const PATIENTS_PAGE_SIZE = 10

function PatientsPagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  disabled?: boolean
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(page, 0), totalPages - 1)
  const rangeStart = total === 0 ? 0 : safePage * pageSize + 1
  const rangeEnd = Math.min((safePage + 1) * pageSize, total)

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#edf0f4] bg-white px-3 py-2">
      <p className="text-xs text-[#64748b]">
        {total === 0
          ? 'No results'
          : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled || safePage <= 0}
          onClick={() => onPageChange(safePage - 1)}
          className="h-8 cursor-pointer rounded-[8px] border border-[#dfe3ea] bg-white px-3 text-xs font-bold text-[#253047] transition hover:border-[#8a37ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="min-w-[4.5rem] text-center text-xs font-semibold text-[#64748b]">
          Page {safePage + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={disabled || safePage >= totalPages - 1}
          onClick={() => onPageChange(safePage + 1)}
          className="h-8 cursor-pointer rounded-[8px] border border-[#dfe3ea] bg-white px-3 text-xs font-bold text-[#253047] transition hover:border-[#8a37ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  accent = 'violet',
}: {
  label: string
  value: string
  accent?: 'violet' | 'amber' | 'emerald' | 'blue'
}) {
  const styles = {
    violet: 'border-[#decaff] bg-[#f3edff] text-[#8a37ff]',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    blue: 'border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]',
  }[accent]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
        styles,
      )}
    >
      <span className="text-base font-bold leading-none text-black">{value}</span>
      <span className="font-medium">{label}</span>
    </span>
  )
}

function PatientListItem({
  patient,
  isSelected,
  onSelect,
}: {
  patient: PatientSummary
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full rounded-[10px] border p-3 text-left transition-all duration-200',
        isSelected
          ? 'border-[#8a37ff] bg-[#faf7ff] shadow-[0_8px_20px_rgba(138,55,255,0.16)] ring-2 ring-[#e9d5ff]'
          : 'border-[#edf0f4] bg-white hover:-translate-y-[1px] hover:border-[#b9c4d4] hover:bg-[#fbfcff] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]',
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          name={patient.name}
          className="h-10 w-10 shrink-0 text-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-black">{patient.name}</p>
          <p className="mt-2 text-xs font-semibold text-[#64748b]">
            {patient.totalVisits} visit{patient.totalVisits === 1 ? '' : 's'}
            {patient.pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                {patient.pendingCount} pending
              </span>
            )}
          </p>
        </div>
      </div>
    </button>
  )
}

function VisitRow({
  appointment,
  profileTimezone,
  visitPrescriptions,
  onViewPrescription,
}: {
  appointment: DoctorAppointment
  profileTimezone: string
  visitPrescriptions: Prescription[]
  onViewPrescription: (prescriptionIds: string[], visitLabel: string) => void
}) {
  const doctorTimezone = appointmentDoctorTimezone(appointment, profileTimezone)
  const fee = formatFee(appointment.fee_amount, appointment.fee_currency)
  const visitLabel = formatAppointmentDateTime(
    appointment.starts_at,
    doctorTimezone,
  )
  const hasPrescription = visitPrescriptions.length > 0

  return (
    <div className="rounded-[10px] border border-[#edf0f4] bg-white p-3 transition-all duration-200 hover:-translate-y-[1px] hover:border-[#cfd6e1] hover:shadow-[0_8px_20px_rgba(15,23,42,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-black">
            {appointment.issue?.trim() || 'Consultation'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]">
            <FiCalendar className="h-3.5 w-3.5 shrink-0" />
            {visitLabel}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#64748b]">
            <FiClock className="h-3.5 w-3.5 shrink-0" />
            {formatAppointmentTimeRange(
              appointment.starts_at,
              appointment.ends_at,
              doctorTimezone,
            )}{' '}
            · {appointment.duration_minutes} min
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
          <WorkflowBadge
            workflowStatus={appointment.workflow_status}
            doctorStatus={appointment.doctor_status}
            appointment={appointment}
          />
        </div>
      </div>
      {(shouldShowAppointmentStatusBadge(appointment) || fee) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {shouldShowAppointmentStatusBadge(appointment) && (
            <StatusBadge status={appointment.status} />
          )}
          {fee && (
            <span className="ml-auto shrink-0 text-xs font-semibold text-[#64748b]">
              {fee}
            </span>
          )}
        </div>
      )}
      <div className="mt-3 border-t border-[#f1f5f9] pt-3">
        {hasPrescription ? (
          <button
            type="button"
            onClick={() =>
              onViewPrescription(
                visitPrescriptions.map((p) => p.id),
                visitLabel,
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e9d5ff] bg-[#faf8ff] px-3 text-xs font-semibold text-[#7c3aed] transition hover:border-[#8a37ff] hover:bg-[#f3edff]"
          >
            <FiEye className="h-3.5 w-3.5" />
            {visitPrescriptions.length === 1
              ? 'See prescription'
              : `See prescriptions (${visitPrescriptions.length})`}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <FiFileText className="h-3.5 w-3.5" />
            No prescription on file
          </span>
        )}
      </div>
    </div>
  )
}

type PrescriptionViewState = {
  prescriptionIds: string[]
  visitLabel: string
} | null

function PatientDetailPanel({
  patient,
  profileTimezone,
  allPrescriptions,
  onViewPrescription,
}: {
  patient: PatientSummary
  profileTimezone: string
  allPrescriptions: Prescription[]
  onViewPrescription: (prescriptionIds: string[], visitLabel: string) => void
}) {
  const lastVisit = patient.lastVisitAt
    ? formatAppointmentDateTime(patient.lastVisitAt, profileTimezone)
    : '—'
  const nextVisit = patient.nextVisitAt
    ? formatAppointmentDateTime(patient.nextVisitAt, profileTimezone)
    : '—'

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#dfe3ea] bg-white shadow-[0_8px_24px_rgba(31,41,55,0.04)]">
      <div className="shrink-0 border-b border-[#edf0f4] px-4 py-4">
        <div className="flex items-start gap-4">
          <UserAvatar name={patient.name} className="h-14 w-14 text-lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-black">{patient.name}</h2>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-[8px] bg-[#f8fafc] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]">
              Visits
            </p>
            <p className="mt-0.5 text-lg font-bold text-black">{patient.totalVisits}</p>
          </div>
          <div className="rounded-[8px] bg-[#f8fafc] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]">
              Last visit
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#111827]">{lastVisit}</p>
          </div>
          <div className="rounded-[8px] bg-[#f8fafc] px-3 py-2 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]">
              Next visit
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#111827]">{nextVisit}</p>
          </div>
        </div>

        <Link
          to={buildManageAppointmentsPath(patient)}
          className="mt-4 inline-flex text-sm font-bold text-[#8a37ff] hover:underline"
        >
          Manage in My Appointments →
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <h3 className="text-sm font-bold text-black">Visit history</h3>
        <div className="mt-3 space-y-2">
          {patient.appointments.map((appointment) => (
            <VisitRow
              key={appointment.id}
              appointment={appointment}
              profileTimezone={profileTimezone}
              visitPrescriptions={findPrescriptionsForVisit(
                allPrescriptions,
                appointment,
                patient,
              )}
              onViewPrescription={onViewPrescription}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function PatientRecordsPage() {
  const { doctorId, isLoading: doctorIdLoading, isError: doctorIdError } =
    useDoctorId()
  const { doctorTimezone: profileTimezone } = useDoctorTimezone()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string>()
  const [prescriptionView, setPrescriptionView] =
    useState<PrescriptionViewState>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch])

  const appointmentsQuery = useQuery({
    queryKey: [DOCTOR_APPOINTMENTS_QUERY_KEY, doctorId],
    queryFn: () => listDoctorAppointments({ doctorId: doctorId! }),
    enabled: Boolean(doctorId),
  })

  const prescriptionsQuery = useQuery({
    queryKey: [DOCTOR_PRESCRIPTIONS_QUERY_KEY, doctorId],
    queryFn: () => listDoctorPrescriptions(),
    enabled: Boolean(doctorId),
  })

  const allPrescriptions = prescriptionsQuery.data?.data ?? []

  const allPatients = useMemo(() => {
    const list = buildPatientDirectory(appointmentsQuery.data?.data ?? [])
    return filterPatients(list, debouncedSearch)
  }, [appointmentsQuery.data?.data, debouncedSearch])

  const totalPatients = allPatients.length

  const paginatedPatients = useMemo(() => {
    const start = page * PATIENTS_PAGE_SIZE
    return allPatients.slice(start, start + PATIENTS_PAGE_SIZE)
  }, [allPatients, page])

  useEffect(() => {
    if (paginatedPatients.length === 0) {
      setSelectedKey(undefined)
      return
    }
    if (
      !selectedKey ||
      !paginatedPatients.some((patient) => patient.key === selectedKey)
    ) {
      setSelectedKey(paginatedPatients[0].key)
    }
  }, [paginatedPatients, selectedKey])

  const selectedPatient = useMemo(() => {
    if (selectedKey) {
      const match = allPatients.find((patient) => patient.key === selectedKey)
      if (match) return match
    }
    return paginatedPatients[0]
  }, [allPatients, paginatedPatients, selectedKey])

  const stats = useMemo(() => {
    const all = buildPatientDirectory(appointmentsQuery.data?.data ?? [])
    return {
      patients: all.length,
      visits: appointmentsQuery.data?.data.length ?? 0,
      pending: all.reduce((sum, p) => sum + p.pendingCount, 0),
    }
  }, [appointmentsQuery.data?.data])

  if (doctorIdLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm font-medium text-[#64748b]">
        Loading your profile…
      </div>
    )
  }

  if (doctorIdError || !doctorId) {
    return (
      <section className="rounded-[12px] border border-amber-200 bg-amber-50 p-8 text-center">
        <FiAlertCircle className="mx-auto h-10 w-10 text-amber-700" />
        <h2 className="mt-4 text-xl font-bold text-black">
          Complete your doctor profile first
        </h2>
        <p className="mt-2 text-sm text-amber-900">
          Patient records are built from appointments linked to your verified
          profile.
        </p>
        <Link
          to="/doctor-onboarding"
          className="mt-6 inline-flex h-12 items-center rounded-[10px] bg-[#8a37ff] px-6 text-sm font-bold text-white transition hover:bg-[#772cf0]"
        >
          Continue onboarding
        </Link>
      </section>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden">
      <section className="shrink-0 rounded-[10px] border border-[#dfe3ea] bg-white px-3 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatPill label="Patients" value={String(stats.patients)} />
            <StatPill
              label="Appointments"
              value={String(stats.visits)}
              accent="blue"
            />
            <StatPill
              label="Pending actions"
              value={String(stats.pending)}
              accent="amber"
            />
          </div>
          <button
            type="button"
            disabled={appointmentsQuery.isFetching}
            onClick={() => void appointmentsQuery.refetch()}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-[#dfe3ea] bg-white px-3 text-xs font-bold text-[#253047] transition hover:border-[#8a37ff] hover:text-[#8a37ff] disabled:opacity-60"
          >
            <FiRefreshCw
              className={clsx(
                'h-3.5 w-3.5',
                appointmentsQuery.isFetching && 'animate-spin',
              )}
            />
            Refresh
          </button>
        </div>

        <div className="mt-2 border-t border-[#eef1f5] pt-2">
          <label className="relative block w-full lg:max-w-sm">
            <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748b]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name"
              className="h-8 w-full rounded-[8px] border border-[#dfe3ea] bg-white pl-8 pr-2 text-sm outline-none focus:border-[#8a37ff]"
            />
          </label>
        </div>
      </section>

      {appointmentsQuery.isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-[10px] border border-[#dfe3ea] bg-white text-sm font-medium text-[#64748b]">
          Loading patient records…
        </div>
      ) : appointmentsQuery.isError ? (
        <section className="flex min-h-0 flex-1 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 p-6 text-center">
          <div>
            <p className="text-sm text-red-700">
              {extractApiErrorMessage(
                appointmentsQuery.error,
                'Unable to load appointments',
              )}
            </p>
            <button
              type="button"
              onClick={() => void appointmentsQuery.refetch()}
              className="mt-3 text-sm font-bold text-[#8a37ff] hover:underline"
            >
              Try again
            </button>
          </div>
        </section>
      ) : totalPatients === 0 ? (
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-[10px] border border-dashed border-[#cfd6e1] bg-white px-6 py-16 text-center">
          <FiUsers className="h-10 w-10 text-[#8a37ff]" />
          <h2 className="mt-4 text-lg font-bold text-black">No patients yet</h2>
          <p className="mt-2 max-w-md text-sm text-[#64748b]">
            {debouncedSearch
              ? 'No patients match your search.'
              : 'Patients appear here after they book an appointment with you.'}
          </p>
        </section>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(340px,38%)] xl:grid-rows-1 xl:overflow-hidden">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[10px] border border-[#dfe3ea] bg-[#fafafa] xl:h-full">
            <div className="shrink-0 border-b border-[#edf0f4] bg-white px-3 py-2">
              <h2 className="text-sm font-bold text-black">
                {totalPatients} patient{totalPatients === 1 ? '' : 's'}
              </h2>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
              {paginatedPatients.length > 0 ? (
                paginatedPatients.map((patient) => (
                  <PatientListItem
                    key={patient.key}
                    patient={patient}
                    isSelected={selectedPatient?.key === patient.key}
                    onSelect={() => setSelectedKey(patient.key)}
                  />
                ))
              ) : (
                <div className="rounded-[10px] border border-dashed border-[#cfd6e1] bg-white px-4 py-10 text-center">
                  <FiUsers className="mx-auto h-8 w-8 text-[#8a37ff]" />
                  <p className="mt-3 text-sm font-bold text-black">
                    No patients on this page
                  </p>
                </div>
              )}
            </div>
            <PatientsPagination
              page={page}
              pageSize={PATIENTS_PAGE_SIZE}
              total={totalPatients}
              disabled={appointmentsQuery.isFetching}
              onPageChange={setPage}
            />
          </section>

          <div className="flex min-h-0 flex-col overflow-hidden xl:h-full">
            {selectedPatient ? (
              <PatientDetailPanel
                patient={selectedPatient}
                profileTimezone={profileTimezone}
                allPrescriptions={allPrescriptions}
                onViewPrescription={(prescriptionIds, visitLabel) =>
                  setPrescriptionView({ prescriptionIds, visitLabel })
                }
              />
            ) : (
              <section className="flex h-full min-h-0 items-center justify-center rounded-[10px] border border-dashed border-[#cfd6e1] bg-white p-6 text-center text-sm text-[#64748b]">
                Select a patient to view visit history.
              </section>
            )}
          </div>
        </div>
      )}

      {prescriptionView && selectedPatient && (
        <PrescriptionViewModal
          prescriptionIds={prescriptionView.prescriptionIds}
          patientName={selectedPatient.name}
          visitLabel={prescriptionView.visitLabel}
          onClose={() => setPrescriptionView(null)}
        />
      )}
    </div>
  )
}
