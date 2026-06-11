import { useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import clsx from 'clsx'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import {
  DOCTOR_SLOTS_QUERY_KEY,
  getDoctorBookableSlots,
} from '../../appointments/api/appointmentsApi'
import {
  countAvailableDoctorBookableSlots,
  groupAvailableDoctorBookableSlots,
} from '../../appointments/lib/doctorBookableSlots'
import type {
  DoctorAppointment,
  DoctorBookableSlot,
} from '../../appointments/types'
import {
  formatDoctorLongDate,
  formatWallClockTime,
  weekdayShortInZone,
} from '../../../lib/doctorTimezone'
import {
  countAppointmentsOnDate,
  formatWeekRangeLabel,
  sortWeekStarts,
  weekDayKeysFromMonday,
} from '../lib/availabilityWeeks'
import type { DoctorAvailability } from '../types'

type AvailabilityWeekPreviewProps = {
  doctorId: string
  availability: DoctorAvailability
  doctorTimezone: string
  appointments: DoctorAppointment[]
  appointmentsLoading?: boolean
}

export function AvailabilityWeekPreview({
  doctorId,
  availability,
  doctorTimezone,
  appointments,
  appointmentsLoading,
}: AvailabilityWeekPreviewProps) {
  const selectedWeeks = useMemo(
    () => sortWeekStarts(availability.selectedWeekStarts),
    [availability.selectedWeekStarts],
  )
  const [weekIndex, setWeekIndex] = useState(0)

  useEffect(() => {
    setWeekIndex((current) =>
      selectedWeeks.length === 0
        ? 0
        : Math.min(current, selectedWeeks.length - 1),
    )
  }, [selectedWeeks])

  const weekStart =
    selectedWeeks.length > 0 ? selectedWeeks[weekIndex] : null
  const weekDays = useMemo(
    () =>
      weekStart ? weekDayKeysFromMonday(weekStart, doctorTimezone) : [],
    [weekStart, doctorTimezone],
  )

  const slotQueries = useQueries({
    queries: weekDays.map((dateKey) => ({
      queryKey: [DOCTOR_SLOTS_QUERY_KEY, doctorId, dateKey],
      queryFn: () => getDoctorBookableSlots({ doctorId, date: dateKey }),
      enabled: Boolean(doctorId.trim() && dateKey),
      staleTime: 60_000,
    })),
  })

  const slotsByDate = useMemo(() => {
    const map = new Map<string, DoctorBookableSlot[]>()
    weekDays.forEach((dateKey, index) => {
      map.set(dateKey, slotQueries[index]?.data ?? [])
    })
    return map
  }, [weekDays, slotQueries])

  const slotsLoading = slotQueries.some((query) => query.isLoading || query.isFetching)
  const slotsError = slotQueries.find((query) => query.isError)?.error

  if (selectedWeeks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#cfd6e1] p-4 text-sm text-[#64748b]">
        Select at least one available week to preview bookable dates.
      </div>
    )
  }

  if (!weekStart) {
    return null
  }

  const weekLabel = formatWeekRangeLabel(weekStart, doctorTimezone)
  const weekAvailableSlots = weekDays.reduce(
    (total, dateKey) =>
      total + countAvailableDoctorBookableSlots(slotsByDate.get(dateKey) ?? []),
    0,
  )
  const weekAppointments = weekDays.reduce(
    (total, dateKey) =>
      total + countAppointmentsOnDate(appointments, dateKey, doctorTimezone),
    0,
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setWeekIndex((index) => Math.max(0, index - 1))}
          disabled={weekIndex === 0}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#64748b] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous week"
        >
          <FiChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold text-[#111827]">{weekLabel}</p>
          <p className="text-[11px] text-[#64748b]">
            Week {weekIndex + 1} of {selectedWeeks.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setWeekIndex((index) =>
              Math.min(selectedWeeks.length - 1, index + 1),
            )
          }
          disabled={weekIndex >= selectedWeeks.length - 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#64748b] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next week"
        >
          <FiChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-[#edf0f4] bg-[#fbfcfe] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
            Available slots
          </p>
          <p className="text-lg font-bold text-[#111827]">
            {slotsLoading ? '…' : weekAvailableSlots}
          </p>
        </div>
        <div className="rounded-md border border-[#edf0f4] bg-[#fbfcfe] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
            Appointments
          </p>
          <p className="text-lg font-bold text-[#111827]">
            {appointmentsLoading ? '…' : weekAppointments}
          </p>
        </div>
      </div>

      {slotsError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {slotsError instanceof Error
            ? slotsError.message
            : 'Unable to load bookable slots for this week.'}
        </p>
      ) : null}

      <div className="space-y-2">
        {weekDays.map((dateKey) => {
          const daySlots = slotsByDate.get(dateKey) ?? []
          const groupedSlots = groupAvailableDoctorBookableSlots(daySlots)
          const availableCount = countAvailableDoctorBookableSlots(daySlots)
          const appointmentCount = appointmentsLoading
            ? 0
            : countAppointmentsOnDate(appointments, dateKey, doctorTimezone)
          const isOpen = availableCount > 0

          return (
            <div
              key={dateKey}
              className={clsx(
                'rounded-md border px-3 py-2.5',
                isOpen
                  ? 'border-[#edf0f4] bg-[#fbfcfe]'
                  : 'border-dashed border-[#e2e8f0] bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827]">
                    {weekdayShortInZone(dateKey, doctorTimezone)}{' '}
                    <span className="font-semibold text-[#64748b]">
                      {formatDoctorLongDate(dateKey, doctorTimezone).replace(
                        /^[^,]+,\s*/,
                        '',
                      )}
                    </span>
                  </p>
                  {slotsLoading ? (
                    <p className="mt-0.5 text-xs text-[#94a3b8]">Loading slots…</p>
                  ) : !isOpen ? (
                    <p className="mt-0.5 text-xs text-[#94a3b8]">No bookable slots</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-[#64748b]">
                      {availableCount} slot{availableCount === 1 ? '' : 's'} open
                    </p>
                  )}
                </div>
                {appointmentCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-[#f3edff] px-2 py-0.5 text-[10px] font-bold text-[#8a37ff]">
                    {appointmentCount} booked
                  </span>
                ) : null}
              </div>

              {!slotsLoading && groupedSlots.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {groupedSlots.map((group) => (
                    <div key={`${dateKey}-${group.period}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                        {group.period}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {group.slots.map((slot) => (
                          <span
                            key={`${dateKey}-${group.period}-${slot.time}`}
                            className="rounded-md border border-[#e2e8f0] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#253047]"
                          >
                            {formatWallClockTime(slot.time)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
