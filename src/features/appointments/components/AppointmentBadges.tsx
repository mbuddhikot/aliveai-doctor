import clsx from 'clsx'
import { DOCTOR_STATUS_META, STATUS_META, WORKFLOW_META } from '../constants'
import { isPastOrDoneAppointment } from '../lib/appointmentStatus'
import type {
  AppointmentStatus,
  AppointmentWorkflowStatus,
  DoctorAppointment,
  DoctorAppointmentStatus,
} from '../types'

type AppointmentBadgeFields = Pick<
  DoctorAppointment,
  'status' | 'workflow_status' | 'doctor_status' | 'starts_at' | 'ends_at'
>

/** Label shown by WorkflowBadge for the same appointment fields. */
export function workflowBadgeLabel(
  appointment: AppointmentBadgeFields,
): string {
  if (isPastOrDoneAppointment(appointment)) {
    if (appointment.doctor_status === 'done') {
      return DOCTOR_STATUS_META.done.label
    }
    return STATUS_META.past.label
  }

  if (appointment.doctor_status) {
    return DOCTOR_STATUS_META[appointment.doctor_status].label
  }

  return (
    WORKFLOW_META[appointment.workflow_status]?.label ??
    WORKFLOW_META.pending.label
  )
}

/** Hide schedule badge when it repeats the workflow/doctor badge (e.g. two "Cancelled"). */
export function shouldShowAppointmentStatusBadge(
  appointment: AppointmentBadgeFields,
): boolean {
  const statusLabel = STATUS_META[appointment.status]?.label ?? ''
  return statusLabel !== workflowBadgeLabel(appointment)
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.upcoming
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold',
        meta.className,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

export function WorkflowBadge({
  workflowStatus,
  doctorStatus,
  appointment,
}: {
  workflowStatus: AppointmentWorkflowStatus
  doctorStatus?: DoctorAppointmentStatus | null
  /** When set, past/done visits show Done or Past instead of Confirmed. */
  appointment?: Pick<
    DoctorAppointment,
    'status' | 'workflow_status' | 'doctor_status' | 'starts_at' | 'ends_at'
  >
}) {
  if (appointment && isPastOrDoneAppointment(appointment)) {
    if (appointment.doctor_status === 'done') {
      const doneMeta = DOCTOR_STATUS_META.done
      return (
        <span
          className={clsx(
            'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-bold',
            doneMeta.className,
          )}
        >
          {doneMeta.label}
        </span>
      )
    }
    const pastMeta = STATUS_META.past
    return (
      <span
        className={clsx(
          'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold',
          pastMeta.className,
        )}
      >
        <span className={clsx('h-1.5 w-1.5 rounded-full', pastMeta.dot)} />
        {pastMeta.label}
      </span>
    )
  }

  if (doctorStatus) {
    const doctorMeta = DOCTOR_STATUS_META[doctorStatus]
    return (
      <span
        className={clsx(
          'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-bold',
          doctorMeta.className,
        )}
      >
        {doctorMeta.label}
      </span>
    )
  }

  const meta = WORKFLOW_META[workflowStatus] ?? WORKFLOW_META.pending
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-bold',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}
