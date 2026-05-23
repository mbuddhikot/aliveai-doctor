import {
  doctorDateKeyFromUtc,
  doctorTimeFromUtc,
  resolveDoctorTimezone,
  utcIsoToDoctorLocal,
} from '../../../lib/doctorTimezone'

export function appointmentDoctorTimezone(
  appointment: { doctor_timezone?: string | null },
  fallbackTimezone: string,
): string {
  return resolveDoctorTimezone(
    appointment.doctor_timezone,
    fallbackTimezone,
  )
}

export function formatAppointmentDateTime(
  iso: string,
  doctorTimezone: string,
): string {
  const local = utcIsoToDoctorLocal(iso, doctorTimezone)
  if (!local) return iso
  return local.toFormat('ccc, LLL d, h:mm a')
}

export function formatAppointmentDate(
  iso: string,
  doctorTimezone: string,
): string {
  const local = utcIsoToDoctorLocal(iso, doctorTimezone)
  if (!local) return iso
  return local.toFormat('cccc, LLLL d, yyyy')
}

export function formatAppointmentTimeRange(
  startsAt: string,
  endsAt: string,
  doctorTimezone: string,
): string {
  const start = utcIsoToDoctorLocal(startsAt, doctorTimezone)
  const end = utcIsoToDoctorLocal(endsAt, doctorTimezone)
  if (!start) return ''
  if (!end) return start.toFormat('h:mm a')
  return `${start.toFormat('h:mm a')} – ${end.toFormat('h:mm a')}`
}

export function formatFee(amount?: number | null, currency?: string | null): string | null {
  if (amount == null || !Number.isFinite(amount)) return null
  const code = currency?.trim() || 'USD'
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${code} ${amount}`
  }
}

/** Doctor-local yyyy-MM-dd for date inputs (from UTC starts_at). */
export function isoToDateInput(iso: string, doctorTimezone: string): string {
  return doctorDateKeyFromUtc(iso, doctorTimezone)
}

/** Doctor-local HH:mm for time inputs (from UTC starts_at). */
export function isoToTimeInput(iso: string, doctorTimezone: string): string {
  return doctorTimeFromUtc(iso, doctorTimezone)
}

export function isAppointmentUpcoming(appointment: {
  status: string
  starts_at: string
}): boolean {
  if (appointment.status === 'cancelled' || appointment.status === 'past') {
    return false
  }
  const startsMs = Date.parse(appointment.starts_at)
  if (Number.isNaN(startsMs)) return false
  return startsMs >= Date.now()
}
