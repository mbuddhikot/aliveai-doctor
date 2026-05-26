import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { FiChevronRight, FiVideo } from 'react-icons/fi'
import {
  StatusBadge,
  WorkflowBadge,
} from '../../appointments/components/AppointmentBadges'
import {
  appointmentDoctorTimezone,
  formatAppointmentTimeRange,
  formatFee,
  isAppointmentUpcoming,
} from '../../appointments/lib/format'
import type { DoctorAppointment } from '../../appointments/types'

type UpcomingAppointmentCardProps = {
  appointment: DoctorAppointment
  profileTimezone: string
  expanded: boolean
  onToggle: () => void
  onStart: () => void
  isStarting: boolean
  startError?: string | null
}

function patientInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  )
}

export function UpcomingAppointmentCard({
  appointment,
  profileTimezone,
  expanded,
  onToggle,
  onStart,
  isStarting,
  startError,
}: UpcomingAppointmentCardProps) {
  const doctorTimezone = appointmentDoctorTimezone(appointment, profileTimezone)
  const timeLabel = formatAppointmentTimeRange(
    appointment.starts_at,
    appointment.ends_at,
    doctorTimezone,
  )
  const name =
    appointment.patient_name?.trim() ||
    appointment.issue?.trim() ||
    'Consultation'
  const canStart =
    appointment.workflow_status === 'confirmed' &&
    isAppointmentUpcoming(appointment)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          'flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition',
          expanded
            ? 'border-[#c4b5fd] shadow-sm ring-1 ring-[#8a37ff]/20'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80',
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
          {patientInitials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{timeLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <WorkflowBadge
            workflowStatus={appointment.workflow_status}
            doctorStatus={appointment.doctor_status}
          />
          <FiChevronRight
            className={clsx(
              'h-4 w-4 text-slate-400 transition',
              expanded && 'rotate-90 text-[#8a37ff]',
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          {appointment.issue && (
            <p className="text-sm text-slate-600">{appointment.issue}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={appointment.status} />
            {formatFee(appointment.fee_amount, appointment.fee_currency) && (
              <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                {formatFee(appointment.fee_amount, appointment.fee_currency)}
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/dashboard/appointments"
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-[#8a37ff]/40 hover:text-[#8a37ff]"
            >
              View details
            </Link>
            {canStart && (
              <button
                type="button"
                disabled={isStarting}
                onClick={onStart}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#8a37ff] px-4 text-xs font-semibold text-white transition hover:bg-[#772cf0] disabled:opacity-60"
              >
                <FiVideo className="h-4 w-4" />
                {isStarting ? 'Starting…' : 'Begin call'}
              </button>
            )}
            {appointment.join_url && !canStart && (
              <a
                href={appointment.join_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-4 text-xs font-semibold text-white hover:bg-slate-900"
              >
                <FiVideo className="h-4 w-4" />
                Join call
              </a>
            )}
          </div>
          {startError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {startError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
