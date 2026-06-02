import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiVideo,
  FiX,
} from 'react-icons/fi'
import {
  approveDoctorAppointment,
  DOCTOR_APPOINTMENTS_QUERY_KEY,
  fetchAppointmentPatientId,
  DOCTOR_APPOINTMENTS_PAGE_SIZE,
  listDoctorAppointmentsPaginated,
  rejectDoctorAppointment,
  rescheduleDoctorAppointment,
} from '../../../features/appointments/api/appointmentsApi'
import { ApproveAppointmentModal } from '../../../features/appointments/components/ApproveAppointmentModal'
import { RejectAppointmentModal } from '../../../features/appointments/components/RejectAppointmentModal'
import { RescheduleAppointmentModal } from '../../../features/appointments/components/RescheduleAppointmentModal'
import {
  StatusBadge,
  WorkflowBadge,
} from '../../../features/appointments/components/AppointmentBadges'
import {
  APPOINTMENT_FILTER_TABS,
  type AppointmentFilterTab,
} from '../../../features/appointments/constants'
import { useDoctorId } from '../../../features/appointments/hooks/useDoctorId'
import {
  applyClientTabFilter,
  sortAppointments,
  tabToApiStatus,
} from '../../../features/appointments/lib/filters'
import {
  appointmentDoctorTimezone,
  formatAppointmentDate,
  formatAppointmentDateTime,
  formatAppointmentTimeRange,
  formatFee,
  isAppointmentUpcoming,
} from '../../../features/appointments/lib/format'
import { useDoctorTimezone } from '../../../features/appointments/hooks/useDoctorTimezone'
import type { DoctorAppointment } from '../../../features/appointments/types'
import {
  startAppointmentErrorMessage,
  useStartAppointment,
} from '../../../features/dashboard/hooks/useStartAppointment'
import { extractApiErrorMessage } from '../../../lib/apiClient'
import {
  createDoctorPrescription,
  deleteDoctorPrescription,
  DOCTOR_PRESCRIPTIONS_QUERY_KEY,
  listDoctorPrescriptions,
  updateDoctorPrescription,
} from '../../../features/prescriptions/api/prescriptionsApi'
import { PrescriptionCard } from '../../../features/prescriptions/components/PrescriptionCard'
import { PrescriptionModal } from '../../../features/prescriptions/components/PrescriptionModal'
import { buildPrescriptionPayload } from '../../../features/prescriptions/lib/buildPrescriptionPayload'
import { buildCreatePrescriptionPayload } from '../../../features/prescriptions/lib/buildCreatePrescriptionPayload'
import {
  buildPatientIdByName,
  resolvePatientId,
} from '../../../features/prescriptions/lib/resolvePatientId'
import type { Prescription } from '../../../features/prescriptions/types'

type ModalAction = 'approve' | 'reject' | 'reschedule' | 'prescription' | null
type PrescriptionModalMode = 'create' | 'edit'

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

function AppointmentListItem({
  appointment,
  profileTimezone,
  isSelected,
  onSelect,
}: {
  appointment: DoctorAppointment
  profileTimezone: string
  isSelected: boolean
  onSelect: () => void
}) {
  const doctorTimezone = appointmentDoctorTimezone(appointment, profileTimezone)
  const fee = formatFee(appointment.fee_amount, appointment.fee_currency)
  const needsAction = appointment.workflow_status === 'pending'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full rounded-[10px] border p-3 text-left transition',
        isSelected
          ? 'border-[#8a37ff] bg-[#faf7ff] shadow-[0_4px_16px_rgba(138,55,255,0.12)]'
          : 'border-[#edf0f4] bg-white hover:border-[#cfd6e1] hover:bg-[#fbfcfe]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-black">
            {appointment.patient_name?.trim() ||
              appointment.issue?.trim() ||
              'Consultation'}
          </p>
          {appointment.patient_name && appointment.issue && (
            <p className="mt-0.5 truncate text-xs text-[#64748b]">
              {appointment.issue.trim()}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#64748b]">
            <FiCalendar className="h-4 w-4 shrink-0" />
            {formatAppointmentDateTime(appointment.starts_at, doctorTimezone)}
          </p>
        </div>
        {needsAction && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Action
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <WorkflowBadge
          workflowStatus={appointment.workflow_status}
          doctorStatus={appointment.doctor_status}
        />
        <StatusBadge status={appointment.status} />
        {fee && (
          <span className="text-xs font-semibold text-[#64748b]">{fee}</span>
        )}
      </div>
    </button>
  )
}

function AppointmentDetailPanel({
  appointment,
  profileTimezone,
  prescriptions,
  onApprove,
  onReject,
  onReschedule,
  onStartCall,
  onCreatePrescription,
  onEditPrescription,
  isStartingCall,
}: {
  appointment: DoctorAppointment
  profileTimezone: string
  prescriptions: Prescription[]
  onApprove: () => void
  onReject: () => void
  onReschedule: () => void
  onStartCall: () => void
  onCreatePrescription: () => void
  onEditPrescription: (prescription: Prescription) => void
  isStartingCall?: boolean
}) {
  const doctorTimezone = appointmentDoctorTimezone(appointment, profileTimezone)
  const fee = formatFee(appointment.fee_amount, appointment.fee_currency)
  const isPending = appointment.workflow_status === 'pending'
  const isRejected = appointment.workflow_status === 'reject'
  const isConfirmed = appointment.workflow_status === 'confirmed'
  const canReschedule =
    isConfirmed && appointment.status === 'upcoming' && !isRejected
  const canStartCall =
    isConfirmed && isAppointmentUpcoming(appointment)
  const showPrescriptionAction = Boolean(
    appointment.patient_name?.trim() || appointment.patient_id,
  )

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#dfe3ea] bg-white shadow-[0_8px_24px_rgba(31,41,55,0.04)]">
      <div className="shrink-0 border-b border-[#edf0f4] px-4 py-3">
        <p className="text-base font-bold text-black">
          {appointment.patient_name?.trim() ||
            appointment.issue?.trim() ||
            'Consultation'}
        </p>
        {appointment.patient_email && (
          <p className="mt-1 text-sm text-[#64748b]">{appointment.patient_email}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <WorkflowBadge
          workflowStatus={appointment.workflow_status}
          doctorStatus={appointment.doctor_status}
        />
          <StatusBadge status={appointment.status} />
        </div>

        {(isPending || canReschedule || canStartCall || showPrescriptionAction) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#8a37ff] px-4 text-sm font-bold text-white transition hover:bg-[#772cf0]"
                >
                  <FiCheck className="h-4 w-4" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100"
                >
                  <FiX className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}
            {canReschedule && (
              <button
                type="button"
                onClick={onReschedule}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#dfe3ea] bg-white px-4 text-sm font-bold text-[#253047] transition hover:border-[#8a37ff]"
              >
                <FiCalendar className="h-4 w-4" />
                Reschedule
              </button>
            )}
            {canStartCall && (
              appointment.join_url ? (
                <a
                  href={appointment.join_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#111827] px-4 text-sm font-bold text-white transition hover:bg-black"
                >
                  <FiVideo className="h-4 w-4" />
                  Join call
                </a>
              ) : (
                <button
                  type="button"
                  disabled={isStartingCall}
                  onClick={onStartCall}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#111827] px-4 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
                >
                  <FiVideo className="h-4 w-4" />
                  {isStartingCall ? 'Starting…' : 'Start call'}
                </button>
              )
            )}
            {showPrescriptionAction && (
              <button
                type="button"
                onClick={onCreatePrescription}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#8a37ff] px-4 text-sm font-bold text-white transition hover:bg-[#772cf0]"
              >
                <FiFileText className="h-4 w-4" />
                Create prescription
              </button>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <DetailRow
            icon={<FiCalendar className="h-4 w-4" />}
            label="Date"
            value={formatAppointmentDate(appointment.starts_at, doctorTimezone)}
          />
          <DetailRow
            icon={<FiClock className="h-4 w-4" />}
            label="Time"
            value={formatAppointmentTimeRange(
              appointment.starts_at,
              appointment.ends_at,
              doctorTimezone,
            )}
          />
          <DetailRow
            icon={<FiClock className="h-4 w-4" />}
            label="Duration"
            value={`${appointment.duration_minutes} minutes`}
          />
          {fee && (
            <DetailRow
              icon={<FiCheck className="h-4 w-4" />}
              label="Fee"
              value={fee}
            />
          )}
        </div>

        {appointment.video_message && (
          <div className="rounded-[10px] border border-[#e6e8ee] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748b]">
              Video message
            </p>
            <p className="mt-2 text-sm leading-6 text-[#253047]">
              {appointment.video_message}
            </p>
          </div>
        )}

        {appointment.rejection_reason && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-red-700">
              Rejection reason
            </p>
            <p className="mt-1 text-sm text-red-800">
              {appointment.rejection_reason}
            </p>
          </div>
        )}

        {prescriptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748b]">
              Prescriptions ({prescriptions.length})
            </p>
            {prescriptions.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                prescription={prescription}
                onEdit={() => onEditPrescription(prescription)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const APPOINTMENTS_PAGE_SIZE = DOCTOR_APPOINTMENTS_PAGE_SIZE

function AppointmentsPagination({
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

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-[8px] bg-[#f8fafc] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  )
}

export function MyAppointmentsPage() {
  const queryClient = useQueryClient()
  const { doctorId, isLoading: doctorIdLoading, isError: doctorIdError } =
    useDoctorId()
  const { doctorTimezone: profileTimezone } = useDoctorTimezone()

  const [activeTab, setActiveTab] = useState<AppointmentFilterTab>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string>()
  const [modalAction, setModalAction] = useState<ModalAction>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [prescriptionModalMode, setPrescriptionModalMode] =
    useState<PrescriptionModalMode>('create')
  const [editingPrescription, setEditingPrescription] =
    useState<Prescription | null>(null)
  const [startCallError, setStartCallError] = useState<string | null>(null)

  const startCallMutation = useStartAppointment()

  const apiStatus = tabToApiStatus(activeTab)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(0)
  }, [activeTab, debouncedSearch, apiStatus])

  const appointmentsQuery = useQuery({
    queryKey: [
      DOCTOR_APPOINTMENTS_QUERY_KEY,
      doctorId,
      page,
      APPOINTMENTS_PAGE_SIZE,
      debouncedSearch,
      apiStatus,
    ],
    queryFn: () =>
      listDoctorAppointmentsPaginated({
        doctorId: doctorId!,
        status: apiStatus,
        q: debouncedSearch || undefined,
        limit: APPOINTMENTS_PAGE_SIZE,
        offset: page * APPOINTMENTS_PAGE_SIZE,
      }),
    enabled: Boolean(doctorId),
    placeholderData: (previous) => previous,
  })

  const filteredAppointments = useMemo(() => {
    const list = appointmentsQuery.data?.data ?? []
    return sortAppointments(applyClientTabFilter(list, activeTab))
  }, [activeTab, appointmentsQuery.data?.data])

  const totalAppointments = appointmentsQuery.data?.total ?? 0

  useEffect(() => {
    if (filteredAppointments.length === 0) {
      setSelectedId(undefined)
      return
    }
    if (!selectedId || !filteredAppointments.some((item) => item.id === selectedId)) {
      setSelectedId(filteredAppointments[0].id)
    }
  }, [filteredAppointments, selectedId])

  const selectedAppointment =
    filteredAppointments.find((item) => item.id === selectedId) ??
    filteredAppointments[0]

  const prescriptionsQuery = useQuery({
    queryKey: [DOCTOR_PRESCRIPTIONS_QUERY_KEY, doctorId],
    queryFn: () => listDoctorPrescriptions(),
    enabled: Boolean(doctorId),
  })

  const appointmentPrescriptions = useMemo(() => {
    if (!selectedAppointment) return []
    const list = prescriptionsQuery.data?.data ?? []
    const patientName = selectedAppointment.patient_name?.trim().toLowerCase()
    return list.filter(
      (item) =>
        item.appointment_id === selectedAppointment.id ||
        (selectedAppointment.patient_id &&
          item.patient_id === selectedAppointment.patient_id) ||
        (patientName &&
          item.patient_name?.trim().toLowerCase() === patientName),
    )
  }, [prescriptionsQuery.data?.data, selectedAppointment])

  const patientIdByName = useMemo(
    () => buildPatientIdByName(appointmentsQuery.data?.data ?? []),
    [appointmentsQuery.data?.data],
  )

  const selectedPatientId = useMemo(() => {
    if (!selectedAppointment) return null
    return resolvePatientId(
      selectedAppointment,
      prescriptionsQuery.data?.data ?? [],
      patientIdByName,
    )
  }, [
    selectedAppointment,
    prescriptionsQuery.data?.data,
    patientIdByName,
  ])

  const appointmentPatientIdQuery = useQuery({
    queryKey: [
      'appointment-patient-id',
      selectedAppointment?.id,
      selectedPatientId,
    ],
    queryFn: () =>
      fetchAppointmentPatientId(selectedAppointment!.id, doctorId!),
    enabled: Boolean(
      doctorId && selectedAppointment?.id && !selectedPatientId,
    ),
    staleTime: 60_000,
  })

  const effectivePatientId =
    selectedPatientId ?? appointmentPatientIdQuery.data ?? null

  const stats = useMemo(() => {
    const list = appointmentsQuery.data?.data ?? []
    return {
      total: totalAppointments,
      pending: list.filter((a) => a.workflow_status === 'pending').length,
      upcoming: list.filter((a) => a.status === 'upcoming').length,
      confirmed: list.filter((a) => a.workflow_status === 'confirmed').length,
    }
  }, [appointmentsQuery.data?.data, totalAppointments])

  const invalidateAppointments = () => {
    void queryClient.invalidateQueries({
      queryKey: [DOCTOR_APPOINTMENTS_QUERY_KEY],
    })
  }

  const invalidatePrescriptions = () => {
    void queryClient.invalidateQueries({
      queryKey: [DOCTOR_PRESCRIPTIONS_QUERY_KEY],
    })
  }

  const approveMutation = useMutation({
    mutationFn: (joinUrl?: string) =>
      approveDoctorAppointment({
        appointmentId: selectedAppointment!.id,
        doctorId: doctorId!,
        payload: joinUrl ? { join_url: joinUrl } : {},
      }),
    onSuccess: () => {
      setModalAction(null)
      setActionError(null)
      invalidateAppointments()
    },
    onError: (err) => {
      setActionError(extractApiErrorMessage(err, 'Unable to approve'))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      rejectDoctorAppointment({
        appointmentId: selectedAppointment!.id,
        doctorId: doctorId!,
        payload: { reason },
      }),
    onSuccess: () => {
      setModalAction(null)
      setActionError(null)
      invalidateAppointments()
    },
    onError: (err) => {
      setActionError(extractApiErrorMessage(err, 'Unable to reject'))
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: (payload: {
      date: string
      time: string
      duration_minutes: number
    }) =>
      rescheduleDoctorAppointment({
        appointmentId: selectedAppointment!.id,
        doctorId: doctorId!,
        doctorTimezone: appointmentDoctorTimezone(
          selectedAppointment!,
          profileTimezone,
        ),
        payload,
      }),
    onSuccess: () => {
      setModalAction(null)
      setActionError(null)
      invalidateAppointments()
    },
    onError: (err) => {
      setActionError(extractApiErrorMessage(err, 'Unable to reschedule'))
    },
  })

  const createPrescriptionMutation = useMutation({
    mutationFn: async (payload: { diagnosis: string; notes: string }) => {
      let patientId = effectivePatientId
      if (!patientId) {
        patientId = await fetchAppointmentPatientId(
          selectedAppointment!.id,
          doctorId!,
        )
      }
      if (!patientId) {
        throw new Error(
          'Could not find the patient for this appointment. The appointments API must include patient_id, or try again after the patient has a prior prescription.',
        )
      }
      return createDoctorPrescription(
        buildCreatePrescriptionPayload({
          appointmentId: selectedAppointment!.id,
          patientUserId: patientId,
          diagnosis: payload.diagnosis,
          notes: payload.notes,
        }),
      )
    },
    onSuccess: () => {
      setModalAction(null)
      setActionError(null)
      invalidatePrescriptions()
    },
    onError: (err) => {
      setActionError(extractApiErrorMessage(err, 'Unable to save prescription'))
    },
  })

  const updatePrescriptionMutation = useMutation({
    mutationFn: (payload: { diagnosis: string; notes: string }) =>
      updateDoctorPrescription({
        prescriptionId: editingPrescription!.id,
        payload: buildPrescriptionPayload(payload),
      }),
    onSuccess: () => {
      setModalAction(null)
      setEditingPrescription(null)
      setActionError(null)
      invalidatePrescriptions()
    },
    onError: (err) => {
      setActionError(extractApiErrorMessage(err, 'Unable to update prescription'))
    },
  })

  const deletePrescriptionMutation = useMutation({
    mutationFn: () => deleteDoctorPrescription(editingPrescription!.id),
    onSuccess: () => {
      setModalAction(null)
      setEditingPrescription(null)
      setActionError(null)
      invalidatePrescriptions()
    },
    onError: (err) => {
      setActionError(extractApiErrorMessage(err, 'Unable to delete prescription'))
    },
  })

  const openModal = (action: ModalAction) => {
    setActionError(null)
    setModalAction(action)
  }

  const openCreatePrescription = () => {
    setPrescriptionModalMode('create')
    setEditingPrescription(null)
    openModal('prescription')
  }

  const openEditPrescription = (prescription: Prescription) => {
    setPrescriptionModalMode('edit')
    setEditingPrescription(prescription)
    openModal('prescription')
  }

  const closePrescriptionModal = () => {
    setModalAction(null)
    setEditingPrescription(null)
    setActionError(null)
  }

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
          Appointments are linked to your verified doctor profile. Finish onboarding
          to view and manage bookings.
        </p>
      </section>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden">
      <section className="shrink-0 rounded-[10px] border border-[#dfe3ea] bg-white px-3 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatPill label="Total" value={String(stats.total)} />
            <StatPill
              label="Pending"
              value={String(stats.pending)}
              accent="amber"
            />
            <StatPill
              label="Upcoming"
              value={String(stats.upcoming)}
              accent="blue"
            />
            <StatPill
              label="Confirmed"
              value={String(stats.confirmed)}
              accent="emerald"
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

        <div className="mt-2 flex flex-col gap-2 border-t border-[#eef1f5] pt-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
            {APPOINTMENT_FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition',
                  activeTab === tab.id
                    ? 'bg-[#8a37ff] text-white'
                    : 'bg-[#f1f5f9] text-[#64748b] hover:bg-violet-50 hover:text-[#8a37ff]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label className="relative block w-full shrink-0 lg:w-56">
            <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748b]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, issue, or ID"
              className="h-8 w-full rounded-[8px] border border-[#dfe3ea] bg-white pl-8 pr-2 text-sm outline-none focus:border-[#8a37ff]"
            />
          </label>
        </div>
      </section>

      {appointmentsQuery.isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-[10px] border border-[#dfe3ea] bg-white text-sm font-medium text-[#64748b]">
          Loading appointments…
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
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(340px,38%)] xl:grid-rows-1 xl:overflow-hidden">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[10px] border border-[#dfe3ea] bg-[#fafafa] xl:h-full">
            <div className="shrink-0 border-b border-[#edf0f4] bg-white px-3 py-2">
              <h2 className="text-sm font-bold text-black">
                {totalAppointments} appointment
                {totalAppointments === 1 ? '' : 's'}
                {activeTab === 'upcoming' && filteredAppointments.length !== totalAppointments
                  ? ` · ${filteredAppointments.length} upcoming on this page`
                  : ''}
              </h2>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment) => (
                  <AppointmentListItem
                    key={appointment.id}
                    appointment={appointment}
                    profileTimezone={profileTimezone}
                    isSelected={selectedAppointment?.id === appointment.id}
                    onSelect={() => setSelectedId(appointment.id)}
                  />
                ))
              ) : (
                <div className="rounded-[10px] border border-dashed border-[#cfd6e1] bg-white px-4 py-10 text-center">
                  <FiCalendar className="mx-auto h-8 w-8 text-[#8a37ff]" />
                  <p className="mt-3 text-sm font-bold text-black">
                    No appointments found
                  </p>
                </div>
              )}
            </div>
            <AppointmentsPagination
              page={page}
              pageSize={APPOINTMENTS_PAGE_SIZE}
              total={totalAppointments}
              disabled={appointmentsQuery.isFetching}
              onPageChange={setPage}
            />
          </section>

          <div className="flex min-h-0 flex-col overflow-hidden xl:h-full">
            {selectedAppointment ? (
              <AppointmentDetailPanel
                appointment={selectedAppointment}
                profileTimezone={profileTimezone}
                prescriptions={appointmentPrescriptions}
                onApprove={() => openModal('approve')}
                onReject={() => openModal('reject')}
                onReschedule={() => openModal('reschedule')}
                onStartCall={() => {
                  if (!selectedAppointment) return
                  setStartCallError(null)
                  startCallMutation.mutate(selectedAppointment.id, {
                    onError: (err) =>
                      setStartCallError(startAppointmentErrorMessage(err)),
                  })
                }}
                isStartingCall={startCallMutation.isPending}
                onCreatePrescription={openCreatePrescription}
                onEditPrescription={openEditPrescription}
              />
            ) : (
              <section className="flex h-full min-h-0 items-center justify-center rounded-[10px] border border-dashed border-[#cfd6e1] bg-white p-6 text-center text-sm text-[#64748b]">
                Select an appointment to view details.
              </section>
            )}
          </div>
        </div>
      )}

      {modalAction === 'approve' && selectedAppointment && (
        <ApproveAppointmentModal
          isSubmitting={approveMutation.isPending}
          error={actionError}
          onClose={() => setModalAction(null)}
          onConfirm={(joinUrl) => approveMutation.mutate(joinUrl)}
        />
      )}

      {modalAction === 'reject' && selectedAppointment && (
        <RejectAppointmentModal
          isSubmitting={rejectMutation.isPending}
          error={actionError}
          onClose={() => setModalAction(null)}
          onConfirm={(reason) => rejectMutation.mutate(reason)}
        />
      )}

      {modalAction === 'reschedule' && selectedAppointment && (
        <RescheduleAppointmentModal
          appointment={selectedAppointment}
          profileTimezone={profileTimezone}
          isSubmitting={rescheduleMutation.isPending}
          error={actionError}
          onClose={() => setModalAction(null)}
          onConfirm={(payload) => rescheduleMutation.mutate(payload)}
        />
      )}

      {modalAction === 'prescription' && selectedAppointment && (
        <PrescriptionModal
          mode={prescriptionModalMode}
          patientName={selectedAppointment.patient_name}
          defaultDiagnosis={selectedAppointment.issue}
          prescription={editingPrescription ?? undefined}
          isSubmitting={
            createPrescriptionMutation.isPending ||
            updatePrescriptionMutation.isPending
          }
          isDeleting={deletePrescriptionMutation.isPending}
          error={actionError}
          onClose={closePrescriptionModal}
          onSave={(payload) => {
            if (prescriptionModalMode === 'edit') {
              updatePrescriptionMutation.mutate(payload)
            } else {
              createPrescriptionMutation.mutate(payload)
            }
          }}
          onDelete={
            prescriptionModalMode === 'edit'
              ? () => deletePrescriptionMutation.mutate()
              : undefined
          }
        />
      )}
    </div>
  )
}
