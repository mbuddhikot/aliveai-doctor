import {
  appointmentDoctorTimezone,
  isoToDateInput,
  isoToTimeInput,
  isAppointmentUpcoming,
} from '../../appointments/lib/format'
import type { DoctorAppointment } from '../../appointments/types'
import type { CalendarAppointment, CalendarDisplayStatus } from '../types'

export type CalendarStatusFilter = 'all' | CalendarDisplayStatus

export function isPendingAppointment(appointment: DoctorAppointment): boolean {
  return (
    appointment.doctor_status === 'pending' ||
    appointment.workflow_status === 'pending'
  )
}

export function isConfirmedAppointment(appointment: DoctorAppointment): boolean {
  return (
    appointment.doctor_status === 'confirm' ||
    appointment.workflow_status === 'confirmed'
  )
}

/** Mutually exclusive calendar color — used for pills, badges, and filters. */
export function calendarDisplayStatus(
  appointment: DoctorAppointment,
): CalendarDisplayStatus {
  if (isPendingAppointment(appointment)) return 'pending'
  if (isConfirmedAppointment(appointment)) return 'confirmed'
  if (
    appointment.status === 'upcoming' ||
    appointment.doctor_status === 'postponed' ||
    isAppointmentUpcoming(appointment)
  ) {
    return 'upcoming'
  }
  return 'upcoming'
}

export function isCalendarEligible(appointment: DoctorAppointment): boolean {
  if (
    appointment.status === 'cancelled' ||
    appointment.workflow_status === 'reject' ||
    appointment.doctor_status === 'cancelled'
  ) {
    return false
  }

  const status = calendarDisplayStatus(appointment)
  return status === 'pending' || status === 'confirmed' || status === 'upcoming'
}

export function matchesCalendarStatusFilter(
  appointment: DoctorAppointment,
  filter: CalendarStatusFilter,
): boolean {
  if (filter === 'all') return true
  return calendarDisplayStatus(appointment) === filter
}

export function doctorAppointmentToCalendar(
  appointment: DoctorAppointment,
  profileTimezone: string,
): CalendarAppointment {
  const doctorTimezone = appointmentDoctorTimezone(
    appointment,
    profileTimezone,
  )
  const date = isoToDateInput(appointment.starts_at, doctorTimezone)
  const start = isoToTimeInput(appointment.starts_at, doctorTimezone)
  const end = isoToTimeInput(appointment.ends_at, doctorTimezone) || start

  return {
    id: appointment.id,
    patientName: appointment.patient_name?.trim() || 'Patient',
    patientEmail: appointment.patient_email ?? undefined,
    date,
    start,
    end,
    status: calendarDisplayStatus(appointment),
    mode: 'video',
    reason: appointment.issue?.trim() || 'Consultation',
    notes: appointment.video_message ?? undefined,
    joinUrl: appointment.join_url?.trim() || undefined,
  }
}

export function mapDoctorAppointmentsToCalendar(
  appointments: DoctorAppointment[],
  profileTimezone: string,
): CalendarAppointment[] {
  return appointments
    .filter(isCalendarEligible)
    .map((item) => doctorAppointmentToCalendar(item, profileTimezone))
    .filter((item) => Boolean(item.date && item.start))
}
