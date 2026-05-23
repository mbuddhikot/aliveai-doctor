import {
  appointmentDoctorTimezone,
  isoToDateInput,
  isoToTimeInput,
  isAppointmentUpcoming,
} from '../../appointments/lib/format'
import type { DoctorAppointment } from '../../appointments/types'
import type { CalendarAppointment } from '../types'

export function isCalendarEligible(appointment: DoctorAppointment): boolean {
  return (
    appointment.workflow_status === 'confirmed' &&
    appointment.status === 'upcoming' &&
    isAppointmentUpcoming(appointment)
  )
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
    status: 'confirmed',
    mode: 'video',
    reason: appointment.issue?.trim() || 'Consultation',
    notes: appointment.video_message ?? undefined,
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
