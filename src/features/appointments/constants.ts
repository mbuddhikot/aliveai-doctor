import type {
  AppointmentStatus,
  AppointmentWorkflowStatus,
  DoctorAppointmentStatus,
} from './types'

export type AppointmentFilterTab =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'upcoming'
  | 'past'
  | 'cancelled'

export const APPOINTMENT_FILTER_TABS: {
  id: AppointmentFilterTab
  label: string
}[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending review' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
]

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string; dot: string }
> = {
  upcoming: {
    label: 'Upcoming',
    className: 'bg-[#f3edff] text-[#8a37ff] border-[#decaff]',
    dot: 'bg-[#8a37ff]',
  },
  past: {
    label: 'Past',
    className: 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]',
    dot: 'bg-[#2563eb]',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]',
    dot: 'bg-[#ef4444]',
  },
}

export const DOCTOR_STATUS_META: Record<
  DoctorAppointmentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  confirm: {
    label: 'Confirmed',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  done: {
    label: 'Done',
    className: 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]',
  },
  postponed: {
    label: 'Postponed',
    className: 'bg-violet-50 text-[#8a37ff] border-[#decaff]',
  },
}

export const WORKFLOW_META: Record<
  AppointmentWorkflowStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending approval',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  reject: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
}
