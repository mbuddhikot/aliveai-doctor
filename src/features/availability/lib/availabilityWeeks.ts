import { DateTime } from 'luxon'
import {
  doctorDateKeyFromUtc,
  doctorDateTimeFromKey,
  doctorTodayKey,
} from '../../../lib/doctorTimezone'
import type { DoctorAppointment } from '../../appointments/types'
import type {
  AvailabilityWeekOption,
  DayAvailability,
  DoctorAvailability,
  WeekdayId,
} from '../types'

const LUXON_WEEKDAY_TO_ID: Record<number, WeekdayId> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
}

export function mondayOfWeek(dateKey: string, doctorTimezone: string): string {
  const dt = doctorDateTimeFromKey(dateKey, doctorTimezone)
  return dt.minus({ days: dt.weekday - 1 }).toFormat('yyyy-MM-dd')
}

export function weekDayKeysFromMonday(
  weekStartKey: string,
  doctorTimezone: string,
): string[] {
  const start = doctorDateTimeFromKey(weekStartKey, doctorTimezone)
  return Array.from({ length: 7 }, (_, index) =>
    start.plus({ days: index }).toFormat('yyyy-MM-dd'),
  )
}

export function weekdayIdFromDateKey(
  dateKey: string,
  doctorTimezone: string,
): WeekdayId {
  const weekday = doctorDateTimeFromKey(dateKey, doctorTimezone).weekday
  return LUXON_WEEKDAY_TO_ID[weekday] ?? 'monday'
}

export function weeksOverlappingMonth(
  year: number,
  month: number,
  doctorTimezone: string,
): AvailabilityWeekOption[] {
  const firstOfMonth = DateTime.fromObject(
    { year, month, day: 1 },
    { zone: doctorTimezone },
  )
  const lastOfMonth = firstOfMonth.endOf('month')
  let cursor = firstOfMonth.minus({ days: firstOfMonth.weekday - 1 })
  const weeks: AvailabilityWeekOption[] = []

  while (cursor <= lastOfMonth) {
    const weekStart = cursor.toFormat('yyyy-MM-dd')
    const weekEnd = cursor.plus({ days: 6 })
    weeks.push({
      weekStart,
      label: `${cursor.toFormat('LLL d')} – ${weekEnd.toFormat('LLL d')}`,
    })
    cursor = cursor.plus({ weeks: 1 })
  }

  return weeks
}

export function defaultSelectedWeekStarts(doctorTimezone: string): string[] {
  const today = doctorTodayKey(doctorTimezone)
  const thisMonday = mondayOfWeek(today, doctorTimezone)
  const nextMonday = doctorDateTimeFromKey(thisMonday, doctorTimezone)
    .plus({ weeks: 1 })
    .toFormat('yyyy-MM-dd')
  return [thisMonday, nextMonday]
}

export function sortWeekStarts(weekStarts: string[]): string[] {
  return [...new Set(weekStarts)].sort()
}

export function allDatesInSelectedWeeks(
  selectedWeekStarts: string[],
  doctorTimezone: string,
): Set<string> {
  const dates = new Set<string>()
  for (const weekStart of selectedWeekStarts) {
    for (const dayKey of weekDayKeysFromMonday(weekStart, doctorTimezone)) {
      dates.add(dayKey)
    }
  }
  return dates
}

export function countBookableBlocksForWeek(
  availability: DoctorAvailability,
  weekStartKey: string,
  doctorTimezone: string,
): number {
  const weeklyById = new Map(
    availability.weekly.map((day) => [day.id, day] as const),
  )

  return weekDayKeysFromMonday(weekStartKey, doctorTimezone).reduce(
    (total, dateKey) => {
      const day = weeklyById.get(weekdayIdFromDateKey(dateKey, doctorTimezone))
      if (!day?.enabled) return total
      return total + day.slots.length
    },
    0,
  )
}

export function countBookableBlocksInSelectedWeeks(
  availability: DoctorAvailability,
  doctorTimezone: string,
): number {
  return availability.selectedWeekStarts.reduce(
    (total, weekStart) =>
      total + countBookableBlocksForWeek(availability, weekStart, doctorTimezone),
    0,
  )
}

export function dayAvailabilityForDate(
  availability: DoctorAvailability,
  dateKey: string,
  doctorTimezone: string,
): DayAvailability | undefined {
  const weekdayId = weekdayIdFromDateKey(dateKey, doctorTimezone)
  return availability.weekly.find((day) => day.id === weekdayId)
}

export function countAppointmentsOnDate(
  appointments: DoctorAppointment[],
  dateKey: string,
  doctorTimezone: string,
): number {
  return appointments.filter(
    (appointment) =>
      doctorDateKeyFromUtc(appointment.starts_at, doctorTimezone) === dateKey,
  ).length
}

export function countAppointmentsInSelectedWeeks(
  appointments: DoctorAppointment[],
  selectedWeekStarts: string[],
  doctorTimezone: string,
): number {
  const allowedDates = allDatesInSelectedWeeks(selectedWeekStarts, doctorTimezone)
  return appointments.filter((appointment) => {
    const dateKey = doctorDateKeyFromUtc(appointment.starts_at, doctorTimezone)
    return dateKey && allowedDates.has(dateKey)
  }).length
}

export function formatWeekRangeLabel(
  weekStartKey: string,
  doctorTimezone: string,
): string {
  const start = doctorDateTimeFromKey(weekStartKey, doctorTimezone)
  const end = start.plus({ days: 6 })
  return `${start.toFormat('LLL d')} – ${end.toFormat('LLL d, yyyy')}`
}
