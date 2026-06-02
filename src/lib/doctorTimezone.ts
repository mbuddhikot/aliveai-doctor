import { DateTime } from 'luxon'
import {
  DEFAULT_PROFILE_TIMEZONE,
  PROFILE_TIMEZONES,
} from '../features/doctor-onboarding/constants'

/** Human-readable label for profile IANA timezone (e.g. Pacific (America/Los_Angeles)). */
export function formatDoctorTimezoneLabel(iana: string): string {
  const trimmed = iana.trim()
  return (
    PROFILE_TIMEZONES.find((entry) => entry.value === trimmed)?.label ?? trimmed
  )
}

/** Resolve IANA timezone from API/profile fields (doctor_timezone preferred). */
export function resolveDoctorTimezone(
  ...sources: (string | null | undefined)[]
): string {
  for (const source of sources) {
    const trimmed = source?.trim()
    if (trimmed) return trimmed
  }
  return DEFAULT_PROFILE_TIMEZONE
}

/** Parse UTC ISO instant and shift to doctor local zone. */
export function utcIsoToDoctorLocal(
  iso: string,
  doctorTimezone: string,
): DateTime | null {
  const utc = DateTime.fromISO(iso, { zone: 'utc' })
  if (!utc.isValid) return null
  return utc.setZone(doctorTimezone)
}

export function doctorTodayKey(doctorTimezone: string): string {
  return DateTime.now().setZone(doctorTimezone).toFormat('yyyy-MM-dd')
}

export function doctorDateKeyFromUtc(iso: string, doctorTimezone: string): string {
  const local = utcIsoToDoctorLocal(iso, doctorTimezone)
  return local?.toFormat('yyyy-MM-dd') ?? ''
}

export function doctorTimeFromUtc(iso: string, doctorTimezone: string): string {
  const local = utcIsoToDoctorLocal(iso, doctorTimezone)
  return local?.toFormat('HH:mm') ?? ''
}

/** Doctor-local wall clock (yyyy-MM-dd + HH:mm) → UTC ISO-8601 for API payloads. */
export function doctorLocalWallClockToUtcIso(
  dateKey: string,
  time: string,
  doctorTimezone: string,
): string | null {
  const trimmedDate = dateKey.trim()
  const trimmedTime = time.trim()
  if (!trimmedDate || !trimmedTime) return null

  const local = DateTime.fromISO(`${trimmedDate}T${trimmedTime}`, {
    zone: doctorTimezone,
  })
  if (!local.isValid) return null

  return local.toUTC().toISO({ suppressMilliseconds: true })
}

export function doctorDateTimeFromKey(
  dateKey: string,
  doctorTimezone: string,
): DateTime {
  return DateTime.fromISO(dateKey, { zone: doctorTimezone })
}

export function formatDoctorLongDate(
  dateKey: string,
  doctorTimezone: string,
): string {
  const dt = doctorDateTimeFromKey(dateKey, doctorTimezone)
  if (!dt.isValid) return dateKey
  return dt.toFormat('cccc, LLL d')
}

export function formatDoctorMonthYear(
  year: number,
  month: number,
  doctorTimezone: string,
): string {
  const dt = DateTime.fromObject(
    { year, month, day: 1 },
    { zone: doctorTimezone },
  )
  return dt.toFormat('LLLL yyyy')
}

export function addMonthsInZone(
  year: number,
  month: number,
  amount: number,
  doctorTimezone: string,
): { year: number; month: number } {
  const dt = DateTime.fromObject(
    { year, month, day: 1 },
    { zone: doctorTimezone },
  ).plus({ months: amount })
  return { year: dt.year, month: dt.month }
}

export function addDaysToDateKey(
  dateKey: string,
  amount: number,
  doctorTimezone: string,
): string {
  return doctorDateTimeFromKey(dateKey, doctorTimezone)
    .plus({ days: amount })
    .toFormat('yyyy-MM-dd')
}

function daysBeforeSunday(dt: DateTime): number {
  return dt.weekday === 7 ? 0 : dt.weekday
}

/** 42-day month grid (Sun–Sat) in doctor timezone; keys are yyyy-MM-dd. */
export function calendarMonthDayKeys(
  year: number,
  month: number,
  doctorTimezone: string,
): string[] {
  const firstOfMonth = DateTime.fromObject(
    { year, month, day: 1 },
    { zone: doctorTimezone },
  )
  const gridStart = firstOfMonth.minus({ days: daysBeforeSunday(firstOfMonth) })
  return Array.from({ length: 42 }, (_, index) =>
    gridStart.plus({ days: index }).toFormat('yyyy-MM-dd'),
  )
}

export function weekdayShortInZone(
  dateKey: string,
  doctorTimezone: string,
): string {
  return doctorDateTimeFromKey(dateKey, doctorTimezone).toFormat('ccc')
}

export function dayOfMonthInZone(
  dateKey: string,
  doctorTimezone: string,
): number {
  return doctorDateTimeFromKey(dateKey, doctorTimezone).day
}

export function monthOfDateKey(
  dateKey: string,
  doctorTimezone: string,
): number {
  return doctorDateTimeFromKey(dateKey, doctorTimezone).month
}

export function calendarMonthFromDateKey(
  dateKey: string,
  doctorTimezone: string,
): { year: number; month: number } {
  const dt = doctorDateTimeFromKey(dateKey, doctorTimezone)
  return { year: dt.year, month: dt.month }
}

export function weekDayKeysAround(
  selectedDateKey: string,
  doctorTimezone: string,
): string[] {
  const selected = doctorDateTimeFromKey(selectedDateKey, doctorTimezone)
  const weekStart = selected.minus({ days: daysBeforeSunday(selected) })
  return Array.from({ length: 7 }, (_, index) =>
    weekStart.plus({ days: index }).toFormat('yyyy-MM-dd'),
  )
}

export function formatWallClockTime(time: string): string {
  const [hourString, minuteString] = time.split(':')
  const hour = Number(hourString)
  if (!Number.isFinite(hour)) return time
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 || 12
  return `${normalizedHour}:${minuteString ?? '00'} ${suffix}`
}
