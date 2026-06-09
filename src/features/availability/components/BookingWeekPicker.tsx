import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import {
  addMonthsInZone,
  calendarMonthFromDateKey,
  doctorTodayKey,
  formatDoctorMonthYear,
} from '../../../lib/doctorTimezone'
import {
  sortWeekStarts,
  weeksOverlappingMonth,
} from '../lib/availabilityWeeks'

type BookingWeekPickerProps = {
  doctorTimezone: string
  selectedWeekStarts: string[]
  onChange: (weekStarts: string[]) => void
}

export function BookingWeekPicker({
  doctorTimezone,
  selectedWeekStarts,
  onChange,
}: BookingWeekPickerProps) {
  const todayKey = doctorTodayKey(doctorTimezone)
  const initialMonth = calendarMonthFromDateKey(todayKey, doctorTimezone)
  const [visibleMonth, setVisibleMonth] = useState(initialMonth)

  const weeks = useMemo(
    () =>
      weeksOverlappingMonth(
        visibleMonth.year,
        visibleMonth.month,
        doctorTimezone,
      ),
    [visibleMonth.month, visibleMonth.year, doctorTimezone],
  )

  const selectedSet = useMemo(
    () => new Set(selectedWeekStarts),
    [selectedWeekStarts],
  )

  const toggleWeek = (weekStart: string) => {
    const next = selectedSet.has(weekStart)
      ? selectedWeekStarts.filter((item) => item !== weekStart)
      : [...selectedWeekStarts, weekStart]
    onChange(sortWeekStarts(next))
  }

  const shiftMonth = (amount: number) => {
    setVisibleMonth((current) =>
      addMonthsInZone(current.year, current.month, amount, doctorTimezone),
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#253047]">
          Available weeks
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#64748b] transition hover:bg-[#f8fafc]"
            aria-label="Previous month"
          >
            <FiChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[7rem] text-center text-xs font-bold text-[#111827]">
            {formatDoctorMonthYear(
              visibleMonth.year,
              visibleMonth.month,
              doctorTimezone,
            )}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#64748b] transition hover:bg-[#f8fafc]"
            aria-label="Next month"
          >
            <FiChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-[#64748b]">
        Choose which calendar weeks patients can book. Each week must start on a
        Monday. Click Save to sync with the server.
      </p>

      <div className="space-y-1.5">
        {weeks.map((week) => {
          const checked = selectedSet.has(week.weekStart)
          return (
            <label
              key={week.weekStart}
              className={clsx(
                'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition',
                checked
                  ? 'border-[#c4b5fd] bg-[#faf7ff]'
                  : 'border-[#edf0f4] bg-white hover:border-[#cfd6e1]',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleWeek(week.weekStart)}
                className="h-4 w-4 rounded border-[#dfe3ea] text-[#8a37ff] focus:ring-[#8a37ff]"
              />
              <span className="text-sm font-semibold text-[#111827]">
                {week.label}
              </span>
            </label>
          )
        })}
      </div>

      {selectedWeekStarts.length === 0 ? (
        <p className="text-xs text-amber-700">
          Select at least one week for the booking preview.
        </p>
      ) : (
        <p className="text-xs text-[#64748b]">
          {selectedWeekStarts.length} week
          {selectedWeekStarts.length === 1 ? '' : 's'} selected
        </p>
      )}
    </div>
  )
}
