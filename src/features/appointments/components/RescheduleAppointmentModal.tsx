import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { formatWallClockTime } from '../../../lib/doctorTimezone'
import {
  DOCTOR_SLOTS_QUERY_KEY,
  getDoctorBookableSlots,
} from '../api/appointmentsApi'
import {
  appointmentDoctorTimezone,
  isoToDateInput,
} from '../lib/format'
import type { DoctorAppointment, DoctorBookableSlot } from '../types'
import { AppointmentModal } from './AppointmentModal'

const SLOT_PERIOD_ORDER = ['Morning', 'Afternoon', 'Evening'] as const

type RescheduleAppointmentModalProps = {
  appointment: DoctorAppointment
  doctorId: string
  profileTimezone: string
  isSubmitting: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (payload: {
    date: string
    time: string
    duration_minutes: number
  }) => void
}

function slotSelectionKey(slot: DoctorBookableSlot): string {
  return `${slot.period}:${slot.time}`
}

function groupAvailableSlots(slots: DoctorBookableSlot[]): Array<{
  period: string
  slots: DoctorBookableSlot[]
}> {
  const byPeriod = new Map<string, DoctorBookableSlot[]>()

  for (const slot of slots) {
    if (!slot.available) continue
    const list = byPeriod.get(slot.period) ?? []
    list.push(slot)
    byPeriod.set(slot.period, list)
  }

  for (const list of byPeriod.values()) {
    list.sort((a, b) => a.time.localeCompare(b.time))
  }

  const orderedPeriods = [
    ...SLOT_PERIOD_ORDER.filter((period) => byPeriod.has(period)),
    ...[...byPeriod.keys()].filter(
      (period) =>
        !SLOT_PERIOD_ORDER.includes(period as (typeof SLOT_PERIOD_ORDER)[number]),
    ),
  ]

  return orderedPeriods.map((period) => ({
    period,
    slots: byPeriod.get(period) ?? [],
  }))
}

export function RescheduleAppointmentModal({
  appointment,
  doctorId,
  profileTimezone,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: RescheduleAppointmentModalProps) {
  const doctorTimezone = appointmentDoctorTimezone(appointment, profileTimezone)
  const durationMinutes = appointment.duration_minutes || 30

  const [date, setDate] = useState(() =>
    isoToDateInput(appointment.starts_at, doctorTimezone),
  )
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null)

  const slotsQuery = useQuery({
    queryKey: [DOCTOR_SLOTS_QUERY_KEY, doctorId, date],
    queryFn: () => getDoctorBookableSlots({ doctorId, date }),
    enabled: Boolean(doctorId.trim() && date.trim()),
  })

  const groupedSlots = useMemo(
    () => groupAvailableSlots(slotsQuery.data ?? []),
    [slotsQuery.data],
  )

  const selectedSlot = useMemo(() => {
    if (!selectedSlotKey || !slotsQuery.data) return null
    return (
      slotsQuery.data.find(
        (slot) => slot.available && slotSelectionKey(slot) === selectedSlotKey,
      ) ?? null
    )
  }, [selectedSlotKey, slotsQuery.data])

  useEffect(() => {
    setSelectedSlotKey(null)
  }, [date])

  const canSubmit =
    date.trim().length > 0 && selectedSlot !== null && !slotsQuery.isFetching

  return (
    <AppointmentModal
      title="Reschedule appointment"
      description="Choose an available slot for this consultation."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-11 rounded-[10px] border border-[#e6e8ee] px-5 text-sm font-bold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !canSubmit}
            onClick={() => {
              if (!selectedSlot) return
              onConfirm({
                date: date.trim(),
                time: selectedSlot.time.trim(),
                duration_minutes: durationMinutes,
              })
            }}
            className="h-11 rounded-[10px] bg-[#8a37ff] px-6 text-sm font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Reschedule'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="block space-y-1">
          <span className="text-sm font-bold text-black">Choose available slot</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-[50px] w-full rounded-[10px] border border-[#b6b6b8] px-4 text-base outline-none focus:border-[#8a37ff]"
          />
        </label>

        {slotsQuery.isLoading || slotsQuery.isFetching ? (
          <div className="rounded-[10px] border border-[#e6e8ee] bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#64748b]">
            Loading available slots…
          </div>
        ) : null}

        {slotsQuery.isError && !slotsQuery.isFetching ? (
          <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {slotsQuery.error instanceof Error
              ? slotsQuery.error.message
              : 'Unable to load available slots.'}
          </p>
        ) : null}

        {!slotsQuery.isLoading &&
        !slotsQuery.isFetching &&
        !slotsQuery.isError &&
        groupedSlots.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#cfd6e1] bg-[#fbfcfe] px-4 py-8 text-center text-sm text-[#64748b]">
            No available slots for this date. Try another day.
          </div>
        ) : null}

        {slotsQuery.isSuccess &&
          groupedSlots.map((group) => (
            <section key={group.period} className="space-y-2">
              <h3 className="text-sm font-bold text-[#253047]">{group.period}</h3>
              <div className="flex flex-wrap gap-2">
                {group.slots.map((slot) => {
                  const key = slotSelectionKey(slot)
                  const isSelected = selectedSlotKey === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedSlotKey(key)}
                      className={clsx(
                        'rounded-[10px] border px-4 py-2.5 text-sm font-bold transition',
                        isSelected
                          ? 'border-[#8a37ff] bg-[#f3edff] text-[#8a37ff]'
                          : 'border-[#e6e8ee] bg-white text-[#253047] hover:border-[#8a37ff] hover:text-[#8a37ff]',
                      )}
                    >
                      {formatWallClockTime(slot.time)}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
      </div>

      {error && (
        <p className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </AppointmentModal>
  )
}
