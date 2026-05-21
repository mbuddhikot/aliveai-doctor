import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiVideo,
  FiX,
} from 'react-icons/fi'
import {
  approveDoctorAppointment,
  listDoctorAppointments,
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
import { filterAppointments, sortAppointments } from '../../../features/appointments/lib/filters'
import {
  formatAppointmentDate,
  formatAppointmentDateTime,
  formatAppointmentTimeRange,
  formatFee,
  isAppointmentUpcoming,
} from '../../../features/appointments/lib/format'
import type { DoctorAppointment } from '../../../features/appointments/types'
import { extractApiErrorMessage } from '../../../lib/apiClient'

type ModalAction = 'approve' | 'reject' | 'reschedule' | null

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
  isSelected,
  onSelect,
}: {
  appointment: DoctorAppointment
  isSelected: boolean
  onSelect: () => void
}) {
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
            {appointment.issue?.trim() || 'Consultation'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#64748b]">
            <FiCalendar className="h-4 w-4 shrink-0" />
            {formatAppointmentDateTime(appointment.starts_at)}
          </p>
        </div>
        {needsAction && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Action
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <WorkflowBadge workflowStatus={appointment.workflow_status} />
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
  onApprove,
  onReject,
  onReschedule,
  onJoin,
}: {
  appointment: DoctorAppointment
  onApprove: () => void
  onReject: () => void
  onReschedule: () => void
  onJoin: () => void
}) {
  const fee = formatFee(appointment.fee_amount, appointment.fee_currency)
  const isPending = appointment.workflow_status === 'pending'
  const isRejected = appointment.workflow_status === 'reject'
  const isConfirmed = appointment.workflow_status === 'confirmed'
  const canReschedule =
    isConfirmed && appointment.status === 'upcoming' && !isRejected
  const canJoin =
    Boolean(appointment.join_url) &&
    isConfirmed &&
    isAppointmentUpcoming(appointment)

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#dfe3ea] bg-white shadow-[0_8px_24px_rgba(31,41,55,0.04)]">
      <div className="shrink-0 border-b border-[#edf0f4] px-4 py-3">
        <p className="text-base font-bold text-black">
          {appointment.issue?.trim() || 'Consultation'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <WorkflowBadge workflowStatus={appointment.workflow_status} />
          <StatusBadge status={appointment.status} />
        </div>

        {(isPending || canReschedule || canJoin) && (
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
            {canJoin && (
              <a
                href={appointment.join_url!}
                target="_blank"
                rel="noreferrer"
                onClick={onJoin}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#111827] px-4 text-sm font-bold text-white transition hover:bg-black"
              >
                <FiVideo className="h-4 w-4" />
                Join call
              </a>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <DetailRow
            icon={<FiCalendar className="h-4 w-4" />}
            label="Date"
            value={formatAppointmentDate(appointment.starts_at)}
          />
          <DetailRow
            icon={<FiClock className="h-4 w-4" />}
            label="Time"
            value={formatAppointmentTimeRange(
              appointment.starts_at,
              appointment.ends_at,
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
      </div>
    </section>
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

  const [activeTab, setActiveTab] = useState<AppointmentFilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [modalAction, setModalAction] = useState<ModalAction>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const appointmentsQuery = useQuery({
    queryKey: ['doctor-appointments', doctorId],
    queryFn: () => listDoctorAppointments({ doctorId: doctorId! }),
    enabled: Boolean(doctorId),
  })

  const filteredAppointments = useMemo(() => {
    const list = appointmentsQuery.data?.data ?? []
    return sortAppointments(filterAppointments(list, activeTab, search))
  }, [activeTab, appointmentsQuery.data?.data, search])

  const selectedAppointment =
    filteredAppointments.find((item) => item.id === selectedId) ??
    filteredAppointments[0]

  const stats = useMemo(() => {
    const list = appointmentsQuery.data?.data ?? []
    return {
      total: list.length,
      pending: list.filter((a) => a.workflow_status === 'pending').length,
      upcoming: list.filter((a) => a.status === 'upcoming').length,
      confirmed: list.filter((a) => a.workflow_status === 'confirmed').length,
    }
  }, [appointmentsQuery.data?.data])

  const invalidateAppointments = () => {
    void queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] })
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

  const openModal = (action: ModalAction) => {
    setActionError(null)
    setModalAction(action)
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
    <div className="flex min-h-[calc(100dvh-7.25rem)] flex-col gap-3">
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
              placeholder="Search issue or ID"
              className="h-8 w-full rounded-[8px] border border-[#dfe3ea] bg-white pl-8 pr-2 text-sm outline-none focus:border-[#8a37ff]"
            />
          </label>
        </div>
      </section>

      {appointmentsQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-[10px] border border-[#dfe3ea] bg-white text-sm font-medium text-[#64748b]">
          Loading appointments…
        </div>
      ) : appointmentsQuery.isError ? (
        <section className="flex flex-1 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 p-6 text-center">
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
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,38%)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[10px] border border-[#dfe3ea] bg-[#fafafa]">
            <div className="shrink-0 border-b border-[#edf0f4] bg-white px-3 py-2">
              <h2 className="text-sm font-bold text-black">
                {filteredAppointments.length} appointment
                {filteredAppointments.length === 1 ? '' : 's'}
              </h2>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment) => (
                  <AppointmentListItem
                    key={appointment.id}
                    appointment={appointment}
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
          </section>

          {selectedAppointment ? (
            <AppointmentDetailPanel
              appointment={selectedAppointment}
              onApprove={() => openModal('approve')}
              onReject={() => openModal('reject')}
              onReschedule={() => openModal('reschedule')}
              onJoin={() => undefined}
            />
          ) : (
            <section className="flex items-center justify-center rounded-[10px] border border-dashed border-[#cfd6e1] bg-white p-6 text-center text-sm text-[#64748b]">
              Select an appointment to view details.
            </section>
          )}
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
          isSubmitting={rescheduleMutation.isPending}
          error={actionError}
          onClose={() => setModalAction(null)}
          onConfirm={(payload) => rescheduleMutation.mutate(payload)}
        />
      )}
    </div>
  )
}
