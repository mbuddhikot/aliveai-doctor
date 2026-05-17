import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiCopy,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiVideo,
} from 'react-icons/fi'
import {
  createDefaultAvailability,
  getDoctorAvailability,
  readAvailabilityDraft,
  saveDoctorAvailability,
  writeAvailabilityDraft,
} from '../../../features/availability/api/availabilityApi'
import type {
  AvailabilityException,
  AvailabilitySlot,
  ConsultationMode,
  DayAvailability,
  DoctorAvailability,
  WeekdayId,
} from '../../../features/availability/types'

const MODE_LABELS: Record<ConsultationMode, string> = {
  video: 'Video',
  clinic: 'Clinic',
  home: 'Home visit',
}

const SLOT_DURATIONS = [15, 20, 30, 45, 60]
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30]
const BOOKING_WINDOWS = [7, 14, 30, 60, 90]

function createId(): string {
  return crypto.randomUUID()
}

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function timeFromMinutes(totalMinutes: number): string {
  const normalized = Math.min(Math.max(totalMinutes, 0), 23 * 60 + 59)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatTime(time: string): string {
  const [hourString, minuteString] = time.split(':')
  const hour = Number(hourString)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 || 12
  return `${normalizedHour}:${minuteString} ${suffix}`
}

function createSlot(start = '09:00', end = '09:30'): AvailabilitySlot {
  return {
    id: createId(),
    start,
    end,
    modes: ['video'],
  }
}

function createException(): AvailabilityException {
  return {
    id: createId(),
    date: new Date().toISOString().slice(0, 10),
    reason: 'Out of office',
    unavailable: true,
  }
}

function countSlots(availability: DoctorAvailability): number {
  return availability.weekly.reduce(
    (total, day) => total + (day.enabled ? day.slots.length : 0),
    0,
  )
}

function countWeeklyHours(availability: DoctorAvailability): number {
  const minutes = availability.weekly.reduce((total, day) => {
    if (!day.enabled) return total
    return (
      total +
      day.slots.reduce(
        (dayTotal, slot) =>
          dayTotal + Math.max(minutesFromTime(slot.end) - minutesFromTime(slot.start), 0),
        0,
      )
    )
  }, 0)

  return Math.round((minutes / 60) * 10) / 10
}

function findOverlaps(slots: AvailabilitySlot[]): string[] {
  const sorted = [...slots].sort(
    (a, b) => minutesFromTime(a.start) - minutesFromTime(b.start),
  )
  const invalidIds = new Set<string>()

  sorted.forEach((slot, index) => {
    if (minutesFromTime(slot.end) <= minutesFromTime(slot.start)) {
      invalidIds.add(slot.id)
    }

    const previous = sorted[index - 1]
    if (previous && minutesFromTime(slot.start) < minutesFromTime(previous.end)) {
      invalidIds.add(slot.id)
      invalidIds.add(previous.id)
    }
  })

  return Array.from(invalidIds)
}

function validateAvailability(availability: DoctorAvailability): string[] {
  const messages: string[] = []

  availability.weekly.forEach((day) => {
    if (!day.enabled) return

    if (day.slots.length === 0) {
      messages.push(`${day.label} is enabled but has no slots.`)
    }

    if (findOverlaps(day.slots).length > 0) {
      messages.push(`${day.label} has overlapping or invalid slots.`)
    }
  })

  if (!availability.weekly.some((day) => day.enabled && day.slots.length > 0)) {
    messages.push('Add at least one available slot.')
  }

  return messages
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string
  hint: string
  icon: ReactNode
}) {
  return (
    <section className="rounded-md border border-[#dfe3ea] bg-white p-5 shadow-[0_12px_30px_rgba(31,41,55,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#64748b]">{label}</p>
          <div className="mt-2 text-3xl font-bold leading-none text-black">
            {value}
          </div>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[#f3edff] text-[#8a37ff]">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm text-[#64748b]">{hint}</p>
    </section>
  )
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-md border border-[#dfe3ea] bg-white shadow-[0_12px_30px_rgba(31,41,55,0.04)]">
      <div className="flex flex-col gap-3 border-b border-[#edf0f4] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-black">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function SelectField({
  label,
  value,
  options,
  suffix,
  onChange,
}: {
  label: string
  value: number
  options: number[]
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#253047]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-11 w-full rounded-md border border-[#dfe3ea] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#8a37ff]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option} {suffix}
          </option>
        ))}
      </select>
    </label>
  )
}

function ModeToggle({
  mode,
  checked,
  onToggle,
}: {
  mode: ConsultationMode
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'h-8 rounded-md border px-3 text-xs font-bold transition',
        checked
          ? 'border-[#8a37ff] bg-[#f3edff] text-[#8a37ff]'
          : 'border-[#dfe3ea] bg-white text-[#64748b] hover:bg-[#f8fafc]',
      )}
    >
      {MODE_LABELS[mode]}
    </button>
  )
}

function SlotEditor({
  slot,
  invalid,
  onChange,
  onRemove,
}: {
  slot: AvailabilitySlot
  invalid: boolean
  onChange: (slot: AvailabilitySlot) => void
  onRemove: () => void
}) {
  const toggleMode = (mode: ConsultationMode) => {
    const modes = slot.modes.includes(mode)
      ? slot.modes.filter((item) => item !== mode)
      : [...slot.modes, mode]

    onChange({
      ...slot,
      modes: modes.length > 0 ? modes : ['video'],
    })
  }

  return (
    <div
      className={clsx(
        'grid gap-3 rounded-md border bg-white p-3 md:grid-cols-[130px_130px_1fr_36px] md:items-center',
        invalid ? 'border-red-200 bg-red-50/40' : 'border-[#edf0f4]',
      )}
    >
      <label className="block">
        <span className="text-xs font-semibold text-[#64748b]">Start</span>
        <input
          type="time"
          value={slot.start}
          onChange={(event) => onChange({ ...slot, start: event.target.value })}
          className="mt-1 h-10 w-full rounded-md border border-[#dfe3ea] bg-white px-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#8a37ff]"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-[#64748b]">End</span>
        <input
          type="time"
          value={slot.end}
          onChange={(event) => onChange({ ...slot, end: event.target.value })}
          className="mt-1 h-10 w-full rounded-md border border-[#dfe3ea] bg-white px-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#8a37ff]"
        />
      </label>
      <div>
        <div className="text-xs font-semibold text-[#64748b]">Visit type</div>
        <div className="mt-1 flex flex-wrap gap-2">
          {(['video', 'clinic', 'home'] as ConsultationMode[]).map((mode) => (
            <ModeToggle
              key={mode}
              mode={mode}
              checked={slot.modes.includes(mode)}
              onToggle={() => toggleMode(mode)}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-100 bg-white text-red-500 transition hover:bg-red-50"
        aria-label="Remove slot"
      >
        <FiTrash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function DayEditor({
  day,
  invalidSlotIds,
  onChange,
}: {
  day: DayAvailability
  invalidSlotIds: string[]
  onChange: (day: DayAvailability) => void
}) {
  const addSlot = () => {
    const lastSlot = day.slots[day.slots.length - 1]
    const start = lastSlot
      ? timeFromMinutes(minutesFromTime(lastSlot.end) + 30)
      : '09:00'
    const end = timeFromMinutes(minutesFromTime(start) + 30)
    onChange({
      ...day,
      enabled: true,
      slots: [...day.slots, createSlot(start, end)],
    })
  }

  return (
    <div className="rounded-md border border-[#dfe3ea] bg-[#fbfcfe]">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={day.enabled}
            onChange={(event) => onChange({ ...day, enabled: event.target.checked })}
            className="h-5 w-5 rounded border-[#dfe3ea] text-[#8a37ff] focus:ring-[#8a37ff]"
          />
          <span className="text-base font-bold text-[#111827]">{day.label}</span>
          <span className="text-sm text-[#64748b]">
            {day.enabled ? `${day.slots.length} slots` : 'Unavailable'}
          </span>
        </label>
        <button
          type="button"
          onClick={addSlot}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#dfe3ea] bg-white px-3 text-sm font-bold text-[#8a37ff] transition hover:bg-[#f3edff]"
        >
          <FiPlus className="h-4 w-4" />
          Add slot
        </button>
      </div>

      {day.enabled ? (
        <div className="space-y-3 border-t border-[#edf0f4] p-3">
          {day.slots.length > 0 ? (
            day.slots.map((slot) => (
              <SlotEditor
                key={slot.id}
                slot={slot}
                invalid={invalidSlotIds.includes(slot.id)}
                onChange={(nextSlot) =>
                  onChange({
                    ...day,
                    slots: day.slots.map((item) =>
                      item.id === slot.id ? nextSlot : item,
                    ),
                  })
                }
                onRemove={() =>
                  onChange({
                    ...day,
                    slots: day.slots.filter((item) => item.id !== slot.id),
                  })
                }
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-[#cfd6e1] bg-white p-4 text-sm text-[#64748b]">
              No slots yet. Add one to accept bookings on {day.label}.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function ExceptionRow({
  item,
  onChange,
  onRemove,
}: {
  item: AvailabilityException
  onChange: (item: AvailabilityException) => void
  onRemove: () => void
}) {
  return (
    <div className="grid gap-3 rounded-md border border-[#edf0f4] bg-white p-3 sm:grid-cols-[150px_1fr_96px_36px] sm:items-center">
      <input
        type="date"
        value={item.date}
        onChange={(event) => onChange({ ...item, date: event.target.value })}
        className="h-10 rounded-md border border-[#dfe3ea] px-3 text-sm font-semibold outline-none focus:border-[#8a37ff]"
      />
      <input
        type="text"
        value={item.reason}
        onChange={(event) => onChange({ ...item, reason: event.target.value })}
        placeholder="Reason"
        className="h-10 rounded-md border border-[#dfe3ea] px-3 text-sm outline-none focus:border-[#8a37ff]"
      />
      <span className="inline-flex h-9 items-center justify-center rounded-md bg-[#fff7ed] px-3 text-xs font-bold text-[#c2410c]">
        Day off
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-100 text-red-500 transition hover:bg-red-50"
        aria-label="Remove exception"
      >
        <FiTrash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function SummaryList({ availability }: { availability: DoctorAvailability }) {
  const activeDays = availability.weekly.filter((day) => day.enabled)

  return (
    <div className="space-y-3">
      {activeDays.length > 0 ? (
        activeDays.map((day) => (
          <div
            key={day.id}
            className="rounded-md border border-[#edf0f4] bg-[#fbfcfe] px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-[#111827]">{day.label}</span>
              <span className="text-xs font-bold text-[#8a37ff]">
                {day.slots.length} slots
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {day.slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-[#253047]">
                    {formatTime(slot.start)} - {formatTime(slot.end)}
                  </span>
                  <span className="text-[#64748b]">
                    {slot.modes.map((mode) => MODE_LABELS[mode]).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-md border border-dashed border-[#cfd6e1] p-4 text-sm text-[#64748b]">
          Your weekly availability is empty.
        </div>
      )}
    </div>
  )
}

export function AvailabilityPage() {
  const draft = useMemo(() => readAvailabilityDraft(), [])
  const [localAvailability, setLocalAvailability] =
    useState<DoctorAvailability | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const availabilityQuery = useQuery({
    queryKey: ['doctor-availability'],
    queryFn: getDoctorAvailability,
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: saveDoctorAvailability,
  })

  const availability =
    localAvailability ||
    availabilityQuery.data ||
    draft ||
    createDefaultAvailability()

  const validationMessages = useMemo(
    () => validateAvailability(availability),
    [availability],
  )
  const hasValidationErrors = validationMessages.length > 0

  const invalidByDay = useMemo(() => {
    const entries = availability.weekly.map((day) => [
      day.id,
      findOverlaps(day.slots),
    ]) as Array<[WeekdayId, string[]]>
    return Object.fromEntries(entries) as Record<WeekdayId, string[]>
  }, [availability.weekly])

  const activeDays = availability.weekly.filter((day) => day.enabled).length
  const weeklyHours = countWeeklyHours(availability)
  const weeklySlots = countSlots(availability)

  const updateAvailability = (next: DoctorAvailability) => {
    setLocalAvailability(next)
    setSaveMessage(null)
  }

  const updateDay = (dayId: WeekdayId, nextDay: DayAvailability) => {
    updateAvailability({
      ...availability,
      weekly: availability.weekly.map((day) =>
        day.id === dayId ? nextDay : day,
      ),
    })
  }

  const copyMondayToWeekdays = () => {
    const monday = availability.weekly.find((day) => day.id === 'monday')
    if (!monday) return

    updateAvailability({
      ...availability,
      weekly: availability.weekly.map((day) => {
        if (['saturday', 'sunday', 'monday'].includes(day.id)) return day
        return {
          ...day,
          enabled: monday.enabled,
          slots: monday.slots.map((slot) => ({ ...slot, id: createId() })),
        }
      }),
    })
  }

  const addException = () => {
    updateAvailability({
      ...availability,
      exceptions: [createException(), ...availability.exceptions],
    })
  }

  const saveAvailability = async () => {
    if (hasValidationErrors) {
      setSaveMessage('Fix the highlighted availability issues before saving.')
      return
    }

    try {
      const saved = await saveMutation.mutateAsync(availability)
      setLocalAvailability(saved)
      setSaveMessage('Availability saved successfully.')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Saved locally. The API did not accept availability yet.'
      writeAvailabilityDraft(availability)
      setSaveMessage(message)
    }
  }

  const resetToDefault = () => {
    updateAvailability(createDefaultAvailability())
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-[#dfe3ea] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(31,41,55,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f3edff] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#8a37ff]">
              <FiCalendar className="h-4 w-4" />
              Doctor availability
            </div>
            <h1 className="mt-3 text-3xl font-bold text-black">
              Manage bookable hours
            </h1>
            <p className="mt-2 max-w-2xl text-base text-[#64748b]">
              Set recurring weekly slots, visit modes, buffers, and planned days
              off so patients only book times that actually work for you.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={resetToDefault}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#dfe3ea] bg-white px-4 text-sm font-bold text-[#253047] transition hover:bg-[#f8fafc]"
            >
              <FiRefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={saveAvailability}
              disabled={saveMutation.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#8a37ff] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(138,55,255,0.2)] transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSave className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save availability'}
            </button>
          </div>
        </div>

        {(availabilityQuery.error || saveMessage || hasValidationErrors) && (
          <div
            className={clsx(
              'mt-5 rounded-md border px-4 py-3 text-sm',
              hasValidationErrors
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : saveMessage?.includes('successfully')
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-[#dfe3ea] bg-[#f8fafc] text-[#64748b]',
            )}
          >
            <div className="flex items-start gap-2">
              {saveMessage?.includes('successfully') ? (
                <FiCheck className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
                <div>
                {saveMessage ||
                  (availabilityQuery.error && draft
                    ? 'Using your saved local draft because the API is unavailable.'
                    : 'Availability API is not reachable right now.')}
                {hasValidationErrors ? (
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {validationMessages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          label="Active days"
          value={`${activeDays}/7`}
          hint="Days open for patient bookings"
          icon={<FiCalendar className="h-5 w-5" />}
        />
        <StatCard
          label="Weekly hours"
          value={`${weeklyHours}h`}
          hint={`${weeklySlots} bookable blocks configured`}
          icon={<FiClock className="h-5 w-5" />}
        />
        <StatCard
          label="Default mode"
          value="Mixed"
          hint="Video, clinic, and home visit slots supported"
          icon={<FiVideo className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Panel
            title="Weekly schedule"
            subtitle={
              availabilityQuery.isLoading
                ? 'Loading saved availability...'
                : 'Use multiple slots per day for morning, afternoon, or evening blocks.'
            }
            action={
              <button
                type="button"
                onClick={copyMondayToWeekdays}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#dfe3ea] bg-white px-3 text-sm font-bold text-[#8a37ff] transition hover:bg-[#f3edff]"
              >
                <FiCopy className="h-4 w-4" />
                Copy Monday
              </button>
            }
          >
            <div className="space-y-3">
              {availability.weekly.map((day) => (
                <DayEditor
                  key={day.id}
                  day={day}
                  invalidSlotIds={invalidByDay[day.id]}
                  onChange={(nextDay) => updateDay(day.id, nextDay)}
                />
              ))}
            </div>
          </Panel>

          <Panel
            title="Days off and exceptions"
            subtitle="Block holidays, conferences, or personal leave without changing your recurring week."
            action={
              <button
                type="button"
                onClick={addException}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#dfe3ea] bg-white px-3 text-sm font-bold text-[#8a37ff] transition hover:bg-[#f3edff]"
              >
                <FiPlus className="h-4 w-4" />
                Add day off
              </button>
            }
          >
            <div className="space-y-3">
              {availability.exceptions.length > 0 ? (
                availability.exceptions.map((exception) => (
                  <ExceptionRow
                    key={exception.id}
                    item={exception}
                    onChange={(nextException) =>
                      updateAvailability({
                        ...availability,
                        exceptions: availability.exceptions.map((item) =>
                          item.id === exception.id ? nextException : item,
                        ),
                      })
                    }
                    onRemove={() =>
                      updateAvailability({
                        ...availability,
                        exceptions: availability.exceptions.filter(
                          (item) => item.id !== exception.id,
                        ),
                      })
                    }
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-[#cfd6e1] bg-[#fbfcfe] p-4 text-sm text-[#64748b]">
                  No exceptions yet. Add a day off when you need to pause
                  bookings for a specific date.
                </div>
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel
            title="Booking rules"
            subtitle="These defaults keep appointments spaced and predictable."
          >
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#253047]">Timezone</span>
                <input
                  type="text"
                  value={availability.timezone}
                  onChange={(event) =>
                    updateAvailability({
                      ...availability,
                      timezone: event.target.value,
                    })
                  }
                  className="mt-2 h-11 w-full rounded-md border border-[#dfe3ea] px-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#8a37ff]"
                />
              </label>
              <SelectField
                label="Slot duration"
                value={availability.slotDurationMinutes}
                options={SLOT_DURATIONS}
                suffix="min"
                onChange={(slotDurationMinutes) =>
                  updateAvailability({ ...availability, slotDurationMinutes })
                }
              />
              <SelectField
                label="Buffer between visits"
                value={availability.bufferMinutes}
                options={BUFFER_OPTIONS}
                suffix="min"
                onChange={(bufferMinutes) =>
                  updateAvailability({ ...availability, bufferMinutes })
                }
              />
              <SelectField
                label="Booking window"
                value={availability.bookingWindowDays}
                options={BOOKING_WINDOWS}
                suffix="days"
                onChange={(bookingWindowDays) =>
                  updateAvailability({ ...availability, bookingWindowDays })
                }
              />
            </div>
          </Panel>

          <Panel
            title="Live preview"
            subtitle="What patients will see once this is published."
          >
            <SummaryList availability={availability} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
