import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiVideo,
} from 'react-icons/fi'
import { useDoctorId } from '../../../features/appointments/hooks/useDoctorId'
import { useDoctorTimezone } from '../../../features/appointments/hooks/useDoctorTimezone'
import { formatDoctorTimezoneLabel } from '../../../lib/doctorTimezone'
import {
  createDefaultAvailability,
  DOCTOR_AVAILABILITY_QUERY_KEY,
  getDoctorAvailability,
  readAvailabilityDraft,
  saveDoctorAvailability,
} from '../../../features/availability/api/availabilityApi'
import type {
  AvailabilityException,
  AvailabilitySlot,
  ConsultationMode,
  DayAvailability,
  DoctorAvailability,
  WeekdayId,
} from '../../../features/availability/types'

const AVAILABILITY_VISIT_MODES = ['video', 'clinic'] as const satisfies readonly ConsultationMode[]

const MODE_LABELS: Record<(typeof AVAILABILITY_VISIT_MODES)[number], string> = {
  video: 'Video',
  clinic: 'Clinic',
}

function normalizeSlotModes(modes: ConsultationMode[]): ConsultationMode[] {
  const allowed = new Set<ConsultationMode>(AVAILABILITY_VISIT_MODES)
  const filtered = modes.filter((mode) => allowed.has(mode))
  return filtered.length > 0 ? filtered : ['video']
}

const SLOT_DURATIONS = [15, 20, 30, 45, 60]
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30]

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
    <section className="rounded-lg border border-[#dfe3ea] bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f3edff] text-[#8a37ff]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
            {label}
          </p>
          <div className="text-xl font-bold leading-tight text-black">{value}</div>
          <p className="truncate text-xs text-[#64748b]">{hint}</p>
        </div>
      </div>
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
    <section className="rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#edf0f4] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-black">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-[#64748b]">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
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
      <span className="text-xs font-medium text-[#253047]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-9 w-full rounded-md border border-[#dfe3ea] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#8a37ff]"
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
  mode: (typeof AVAILABILITY_VISIT_MODES)[number]
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
  const activeModes = normalizeSlotModes(slot.modes)

  const toggleMode = (mode: (typeof AVAILABILITY_VISIT_MODES)[number]) => {
    const modes = activeModes.includes(mode)
      ? activeModes.filter((item) => item !== mode)
      : [...activeModes, mode]

    onChange({
      ...slot,
      modes: normalizeSlotModes(modes),
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
          {AVAILABILITY_VISIT_MODES.map((mode) => (
            <ModeToggle
              key={mode}
              mode={mode}
              checked={activeModes.includes(mode)}
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
                    {normalizeSlotModes(slot.modes)
                      .map((mode) => MODE_LABELS[mode])
                      .join(', ')}
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
  const queryClient = useQueryClient()
  const { doctorId, isLoading: doctorIdLoading, isError: doctorIdError } =
    useDoctorId()
  const { doctorTimezone: profileTimezone } = useDoctorTimezone()
  const draft = useMemo(() => readAvailabilityDraft(), [])
  const [localAvailability, setLocalAvailability] =
    useState<DoctorAvailability | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const availabilityQuery = useQuery({
    queryKey: [DOCTOR_AVAILABILITY_QUERY_KEY, doctorId, profileTimezone],
    queryFn: () => getDoctorAvailability(doctorId!, profileTimezone),
    enabled: Boolean(doctorId),
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: DoctorAvailability) =>
      saveDoctorAvailability(doctorId!, payload),
  })

  const availabilitySource =
    localAvailability ||
    availabilityQuery.data ||
    draft ||
    createDefaultAvailability(profileTimezone)

  const availability = useMemo(
    () => ({
      ...availabilitySource,
      timezone: profileTimezone,
      weekly: availabilitySource.weekly.map((day) => ({
        ...day,
        slots: day.slots.map((slot) => ({
          ...slot,
          modes: normalizeSlotModes(slot.modes),
        })),
      })),
    }),
    [availabilitySource, profileTimezone],
  )

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
      void queryClient.invalidateQueries({
        queryKey: [DOCTOR_AVAILABILITY_QUERY_KEY, doctorId],
      })
      setSaveMessage('Availability saved successfully. Patients can book these times.')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save availability.'
      setSaveMessage(message)
    }
  }

  const resetToDefault = () => {
    updateAvailability(createDefaultAvailability(profileTimezone))
  }

  if (doctorIdLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm font-medium text-[#64748b]">
        Loading your profile…
      </div>
    )
  }

  if (doctorIdError || !doctorId) {
    return (
      <section className="rounded-[12px] border border-amber-200 bg-amber-50 p-8 text-center">
        <FiAlertCircle className="mx-auto h-10 w-10 text-amber-700" />
        <h2 className="mt-4 text-xl font-bold text-black">
          Complete your doctor profile first
        </h2>
        <p className="mt-2 text-sm text-amber-900">
          Availability is linked to your verified doctor profile. Finish
          onboarding to set bookable hours.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-[#dfe3ea] bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3edff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a37ff]">
                <FiCalendar className="h-3 w-3" />
                Doctor availability
              </span>
              <h1 className="text-lg font-bold text-black sm:text-xl">
                Manage bookable hours
              </h1>
            </div>
            <p className="mt-1 text-xs leading-snug text-[#64748b] sm:max-w-xl">
              Weekly slots, visit modes, buffers, and days off for patient booking.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={resetToDefault}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#dfe3ea] bg-white px-3 text-xs font-bold text-[#253047] transition hover:bg-[#f8fafc]"
            >
              <FiRefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={saveAvailability}
              disabled={saveMutation.isPending}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#8a37ff] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSave className="h-3.5 w-3.5" />
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {(availabilityQuery.error || saveMessage || hasValidationErrors) && (
          <div
            className={clsx(
              'mt-3 rounded-md border px-3 py-2 text-xs',
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
                  (availabilityQuery.error
                    ? draft
                      ? 'Could not load availability from the server. Showing your last saved draft on this device.'
                      : 'Could not load availability from the server.'
                    : null)}
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatCard
          label="Active days"
          value={`${activeDays}/7`}
          hint="Open for bookings"
          icon={<FiCalendar className="h-4 w-4" />}
        />
        <StatCard
          label="Weekly hours"
          value={`${weeklyHours}h`}
          hint={`${weeklySlots} blocks`}
          icon={<FiClock className="h-4 w-4" />}
        />
        <StatCard
          label="Default mode"
          value="Mixed"
          hint="Video & clinic"
          icon={<FiVideo className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Panel
            title="Weekly schedule"
            subtitle={
              availabilityQuery.isLoading
                ? 'Loading saved availability...'
                : 'Use multiple slots per day for morning, afternoon, or evening blocks.'
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

        <aside className="space-y-3">
          <Panel
            title="Booking rules"
            subtitle="These defaults keep appointments spaced and predictable."
          >
            <div className="space-y-3">
              <div className="rounded-md border border-[#dfe3ea] bg-[#f8fafc] px-3 py-2">
                <span className="text-xs font-medium text-[#253047]">Timezone</span>
                <p className="mt-0.5 text-sm font-bold text-[#111827]">
                  {formatDoctorTimezoneLabel(profileTimezone)}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-[#64748b]">
                  Weekly slots and patient booking use your profile timezone (
                  <span className="font-mono text-[10px]">{profileTimezone}</span>
                  ).{' '}
                  <Link
                    to="/dashboard/profile"
                    className="font-semibold text-[#8a37ff] hover:underline"
                  >
                    Change in Profile
                  </Link>
                </p>
              </div>
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
