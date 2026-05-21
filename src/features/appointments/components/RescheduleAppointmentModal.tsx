import { useState } from 'react'
import type { DoctorAppointment } from '../types'
import { isoToDateInput, isoToTimeInput } from '../lib/format'
import { AppointmentModal } from './AppointmentModal'

type RescheduleAppointmentModalProps = {
  appointment: DoctorAppointment
  isSubmitting: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (payload: {
    date: string
    time: string
    duration_minutes: number
  }) => void
}

export function RescheduleAppointmentModal({
  appointment,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: RescheduleAppointmentModalProps) {
  const [date, setDate] = useState(isoToDateInput(appointment.starts_at))
  const [time, setTime] = useState(isoToTimeInput(appointment.starts_at))
  const [duration, setDuration] = useState(
    String(appointment.duration_minutes || 30),
  )

  const canSubmit = date.trim() && time.trim() && Number(duration) >= 5

  return (
    <AppointmentModal
      title="Reschedule appointment"
      description="Pick a new date and time for this consultation."
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
            onClick={() =>
              onConfirm({
                date: date.trim(),
                time: time.trim(),
                duration_minutes: Number(duration),
              })
            }
            className="h-11 rounded-[10px] bg-[#8a37ff] px-6 text-sm font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Reschedule'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-black">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-[50px] w-full rounded-[10px] border border-[#b6b6b8] px-4 text-base outline-none focus:border-[#8a37ff]"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-black">Time (24h)</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-[50px] w-full rounded-[10px] border border-[#b6b6b8] px-4 text-base outline-none focus:border-[#8a37ff]"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-black">Duration (min)</span>
          <input
            type="number"
            min={5}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-[50px] w-full rounded-[10px] border border-[#b6b6b8] px-4 text-base outline-none focus:border-[#8a37ff]"
          />
        </label>
      </div>
      {error && (
        <p className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </AppointmentModal>
  )
}
