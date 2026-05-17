import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  FiAlertCircle,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiMapPin,
  FiSearch,
  FiUser,
  FiVideo,
} from 'react-icons/fi'
import {
  createSampleAppointments,
  getBookedAppointments,
} from '../../../features/calendar/api/calendarApi'
import type {
  AppointmentMode,
  AppointmentStatus,
  CalendarAppointment,
} from '../../../features/calendar/types'

type CalendarView = 'month' | 'week' | 'day'
type StatusFilter = 'all' | AppointmentStatus
type ModeFilter = 'all' | AppointmentMode

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string; dot: string }
> = {
  confirmed: {
    label: 'Confirmed',
    className: 'bg-[#ecfdf5] text-[#047857] border-[#bbf7d0]',
    dot: 'bg-[#10b981]',
  },
  ongoing: {
    label: 'Ongoing',
    className: 'bg-[#f3edff] text-[#8a37ff] border-[#decaff]',
    dot: 'bg-[#8a37ff]',
  },
  completed: {
    label: 'Completed',
    className: 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]',
    dot: 'bg-[#2563eb]',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]',
    dot: 'bg-[#ef4444]',
  },
  'no-show': {
    label: 'No-show',
    className: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
    dot: 'bg-[#f97316]',
  },
}

const MODE_META: Record<AppointmentMode, { label: string; icon: ReactNode }> = {
  video: { label: 'Video call', icon: <FiVideo className="h-4 w-4" /> },
  clinic: { label: 'Clinic visit', icon: <FiMapPin className="h-4 w-4" /> },
  home: { label: 'Home visit', icon: <FiMapPin className="h-4 w-4" /> },
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function formatTime(time: string): string {
  const [hourString, minuteString] = time.split(':')
  const hour = Number(hourString)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 || 12
  return `${normalizedHour}:${minuteString} ${suffix}`
}

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function getCalendarDays(visibleDate: Date): Date[] {
  const firstDay = startOfMonth(visibleDate)
  const start = addDays(firstDay, -firstDay.getDay())
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

function sortByTime(appointments: CalendarAppointment[]): CalendarAppointment[] {
  return [...appointments].sort(
    (a, b) => minutesFromTime(a.start) - minutesFromTime(b.start),
  )
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

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center gap-2 rounded-md border px-2.5 text-xs font-bold',
        meta.className,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

function SegmentedControl({
  value,
  onChange,
}: {
  value: CalendarView
  onChange: (value: CalendarView) => void
}) {
  return (
    <div className="grid h-10 w-full min-w-[216px] grid-cols-3 rounded-md border border-[#dfe3ea] bg-[#f8fafc] p-1 sm:w-[216px]">
      {(['month', 'week', 'day'] as CalendarView[]).map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onChange(view)}
          className={clsx(
            'rounded text-sm font-bold capitalize transition',
            value === view
              ? 'bg-white text-[#8a37ff] shadow-sm'
              : 'text-[#64748b] hover:text-[#111827]',
          )}
        >
          {view}
        </button>
      ))}
    </div>
  )
}

function AppointmentPill({
  appointment,
  onClick,
}: {
  appointment: CalendarAppointment
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded px-2 py-1 text-left text-xs font-semibold text-[#253047] transition hover:bg-[#f3edff]"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={clsx(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            STATUS_META[appointment.status].dot,
          )}
        />
        <span className="truncate">
          {appointment.start} {appointment.patientName}
        </span>
      </span>
    </button>
  )
}

function MonthCalendar({
  visibleDate,
  selectedDate,
  appointmentsByDate,
  onSelectDate,
  onSelectAppointment,
}: {
  visibleDate: Date
  selectedDate: string
  appointmentsByDate: Map<string, CalendarAppointment[]>
  onSelectDate: (date: string) => void
  onSelectAppointment: (appointment: CalendarAppointment) => void
}) {
  const days = getCalendarDays(visibleDate)
  const currentMonth = visibleDate.getMonth()

  return (
    <section className="rounded-md border border-[#dfe3ea] bg-white shadow-[0_12px_30px_rgba(31,41,55,0.04)]">
      <div className="grid grid-cols-7 border-b border-[#edf0f4]">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.08em] text-[#64748b]"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day)
          const dayAppointments = sortByTime(appointmentsByDate.get(key) || [])
          const isMuted = day.getMonth() !== currentMonth
          const isSelected = key === selectedDate

          return (
            <div
              key={key}
              className={clsx(
                'min-h-[126px] border-b border-r border-[#edf0f4] p-2 last:border-r-0',
                isSelected && 'bg-[#faf7ff]',
                isMuted && 'bg-[#fbfcfe]',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate(key)}
                className={clsx(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold transition',
                  isToday(day)
                    ? 'bg-[#8a37ff] text-white'
                    : isSelected
                      ? 'bg-[#f3edff] text-[#8a37ff]'
                      : isMuted
                        ? 'text-[#a0a7b2] hover:bg-white'
                        : 'text-[#253047] hover:bg-[#f8fafc]',
                )}
              >
                {day.getDate()}
              </button>

              <div className="mt-1 space-y-1">
                {dayAppointments.slice(0, 3).map((appointment) => (
                  <AppointmentPill
                    key={appointment.id}
                    appointment={appointment}
                    onClick={() => onSelectAppointment(appointment)}
                  />
                ))}
                {dayAppointments.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => onSelectDate(key)}
                    className="px-2 text-xs font-bold text-[#8a37ff]"
                  >
                    +{dayAppointments.length - 3} more
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function AgendaList({
  title,
  appointments,
  selectedId,
  onSelect,
}: {
  title: string
  appointments: CalendarAppointment[]
  selectedId?: string
  onSelect: (appointment: CalendarAppointment) => void
}) {
  return (
    <section className="rounded-md border border-[#dfe3ea] bg-white shadow-[0_12px_30px_rgba(31,41,55,0.04)]">
      <div className="border-b border-[#edf0f4] px-5 py-4">
        <h2 className="text-xl font-bold text-black">{title}</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          {appointments.length} booked slots
        </p>
      </div>
      <div className="max-h-[540px] space-y-3 overflow-auto p-4">
        {appointments.length > 0 ? (
          sortByTime(appointments).map((appointment) => (
            <button
              key={appointment.id}
              type="button"
              onClick={() => onSelect(appointment)}
              className={clsx(
                'w-full rounded-md border p-4 text-left transition',
                selectedId === appointment.id
                  ? 'border-[#8a37ff] bg-[#faf7ff]'
                  : 'border-[#edf0f4] bg-white hover:border-[#cfd6e1] hover:bg-[#fbfcfe]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-[#111827]">
                    {formatTime(appointment.start)} - {formatTime(appointment.end)}
                  </div>
                  <div className="mt-1 text-base font-bold text-black">
                    {appointment.patientName}
                  </div>
                </div>
                <StatusBadge status={appointment.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#64748b]">
                <span className="inline-flex items-center gap-1.5">
                  {MODE_META[appointment.mode].icon}
                  {MODE_META[appointment.mode].label}
                </span>
                <span>{appointment.reason}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-[#cfd6e1] bg-[#fbfcfe] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#f3edff] text-[#8a37ff]">
              <FiCalendar className="h-6 w-6" />
            </div>
            <div className="mt-3 text-base font-bold text-[#111827]">
              No booked slots
            </div>
            <p className="mt-1 text-sm text-[#64748b]">
              Slots will appear here when patients book appointments.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function AppointmentDetails({
  appointment,
}: {
  appointment?: CalendarAppointment
}) {
  return (
    <section className="rounded-md border border-[#dfe3ea] bg-white shadow-[0_12px_30px_rgba(31,41,55,0.04)]">
      <div className="border-b border-[#edf0f4] px-5 py-4">
        <h2 className="text-xl font-bold text-black">Slot details</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Review patient, timing, and appointment status.
        </p>
      </div>
      {appointment ? (
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f8d7c7] to-[#4f9bbd] text-white">
                <FiUser className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-2xl font-bold text-black">
                {appointment.patientName}
              </h3>
              {appointment.patientEmail ? (
                <p className="mt-1 text-sm text-[#64748b]">
                  {appointment.patientEmail}
                </p>
              ) : null}
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-md bg-[#f8fafc] p-4">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748b]">
                Date and time
              </div>
              <div className="mt-2 text-base font-bold text-[#111827]">
                {formatLongDate(appointment.date)}
              </div>
              <div className="mt-1 text-sm text-[#64748b]">
                {formatTime(appointment.start)} - {formatTime(appointment.end)}
              </div>
            </div>
            <div className="rounded-md bg-[#f8fafc] p-4">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748b]">
                Visit mode
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-base font-bold text-[#111827]">
                {MODE_META[appointment.mode].icon}
                {MODE_META[appointment.mode].label}
              </div>
            </div>
            <div className="rounded-md bg-[#f8fafc] p-4">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748b]">
                Reason
              </div>
              <div className="mt-2 text-base font-bold text-[#111827]">
                {appointment.reason}
              </div>
              {appointment.notes ? (
                <p className="mt-2 text-sm text-[#64748b]">{appointment.notes}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="h-11 rounded-md border border-[#dfe3ea] bg-white text-sm font-bold text-[#253047] transition hover:bg-[#f8fafc]"
            >
              Reschedule
            </button>
            <button
              type="button"
              className="h-11 rounded-md bg-[#8a37ff] text-sm font-bold text-white shadow-[0_8px_20px_rgba(138,55,255,0.2)] transition hover:bg-[#772cf0]"
            >
              Start visit
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="rounded-md border border-dashed border-[#cfd6e1] bg-[#fbfcfe] p-6 text-center text-sm text-[#64748b]">
            Select a booked slot to see appointment details.
          </div>
        </div>
      )}
    </section>
  )
}

function WeekStrip({
  selectedDate,
  appointmentsByDate,
  onSelectDate,
}: {
  selectedDate: string
  appointmentsByDate: Map<string, CalendarAppointment[]>
  onSelectDate: (date: string) => void
}) {
  const selected = new Date(`${selectedDate}T12:00:00`)
  const start = addDays(selected, -selected.getDay())
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))

  return (
    <section className="rounded-md border border-[#dfe3ea] bg-white p-4 shadow-[0_12px_30px_rgba(31,41,55,0.04)]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day)
          const count = appointmentsByDate.get(key)?.length || 0
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={clsx(
                'rounded-md border p-3 text-left transition',
                key === selectedDate
                  ? 'border-[#8a37ff] bg-[#faf7ff]'
                  : 'border-[#edf0f4] bg-white hover:bg-[#f8fafc]',
              )}
            >
              <div className="text-xs font-bold uppercase text-[#64748b]">
                {WEEKDAYS[day.getDay()]}
              </div>
              <div className="mt-1 text-2xl font-bold text-black">
                {day.getDate()}
              </div>
              <div className="mt-2 text-xs font-bold text-[#8a37ff]">
                {count} slots
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function CalendarPage() {
  const [visibleDate, setVisibleDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [view, setView] = useState<CalendarView>('month')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>()

  const appointmentsQuery = useQuery({
    queryKey: ['doctor-booked-appointments'],
    queryFn: getBookedAppointments,
    retry: false,
  })

  const sourceAppointments =
    appointmentsQuery.data && appointmentsQuery.data.length > 0
      ? appointmentsQuery.data
      : createSampleAppointments(visibleDate)

  const appointments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sourceAppointments.filter((appointment) => {
      const matchesSearch =
        !query ||
        appointment.patientName.toLowerCase().includes(query) ||
        appointment.reason.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === 'all' || appointment.status === statusFilter
      const matchesMode = modeFilter === 'all' || appointment.mode === modeFilter
      return matchesSearch && matchesStatus && matchesMode
    })
  }, [modeFilter, search, sourceAppointments, statusFilter])

  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarAppointment[]>()
    appointments.forEach((appointment) => {
      grouped.set(appointment.date, [
        ...(grouped.get(appointment.date) || []),
        appointment,
      ])
    })
    return grouped
  }, [appointments])

  const selectedDayAppointments = appointmentsByDate.get(selectedDate) || []
  const selectedAppointment =
    appointments.find((item) => item.id === selectedAppointmentId) ||
    selectedDayAppointments[0]

  const todayAppointments = appointments.filter(
    (appointment) => appointment.date === dateKey(new Date()),
  )
  const upcomingAppointments = appointments.filter(
    (appointment) =>
      new Date(`${appointment.date}T${appointment.start}`) >= new Date() &&
      appointment.status !== 'cancelled',
  )
  const completedCount = appointments.filter(
    (appointment) => appointment.status === 'completed',
  ).length

  const goToToday = () => {
    const today = new Date()
    setVisibleDate(today)
    setSelectedDate(dateKey(today))
    setSelectedAppointmentId(undefined)
  }

  const selectDate = (date: string) => {
    setSelectedDate(date)
    setSelectedAppointmentId(undefined)
  }

  const selectAppointment = (appointment: CalendarAppointment) => {
    setSelectedDate(appointment.date)
    setSelectedAppointmentId(appointment.id)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-[#dfe3ea] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(31,41,55,0.04)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f3edff] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#8a37ff]">
              <FiCalendar className="h-4 w-4" />
              Booked slots
            </div>
            <h1 className="mt-3 text-3xl font-bold text-black">
              Calendar and appointments
            </h1>
            <p className="mt-2 max-w-2xl text-base text-[#64748b]">
              Track booked patient slots, monitor visit status, and open the
              details you need before starting a consultation.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SegmentedControl value={view} onChange={setView} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVisibleDate(addMonths(visibleDate, -1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#253047] transition hover:bg-[#f8fafc]"
                aria-label="Previous month"
              >
                <FiChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="h-10 rounded-md border border-[#dfe3ea] bg-white px-4 text-sm font-bold text-[#253047] transition hover:bg-[#f8fafc]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setVisibleDate(addMonths(visibleDate, 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#253047] transition hover:bg-[#f8fafc]"
                aria-label="Next month"
              >
                <FiChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {appointmentsQuery.error ? (
          <div className="mt-5 rounded-md border border-[#dfe3ea] bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="h-4 w-4" />
              Appointment API is unavailable, so sample booked slots are shown.
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          label="Today"
          value={String(todayAppointments.length)}
          hint="Booked slots on your schedule"
          icon={<FiClock className="h-5 w-5" />}
        />
        <StatCard
          label="Upcoming"
          value={String(upcomingAppointments.length)}
          hint="Confirmed or active future visits"
          icon={<FiCalendar className="h-5 w-5" />}
        />
        <StatCard
          label="Completed"
          value={String(completedCount)}
          hint="Finished appointments in this view"
          icon={<FiUser className="h-5 w-5" />}
        />
      </div>

      <section className="rounded-md border border-[#dfe3ea] bg-white p-4 shadow-[0_12px_30px_rgba(31,41,55,0.04)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px]">
          <label className="relative block">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient or reason"
              className="h-11 w-full rounded-md border border-[#dfe3ea] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#8a37ff]"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="h-11 rounded-md border border-[#dfe3ea] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#8a37ff]"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_META).map(([status, meta]) => (
              <option key={status} value={status}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value as ModeFilter)}
            className="h-11 rounded-md border border-[#dfe3ea] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#8a37ff]"
          >
            <option value="all">All modes</option>
            {Object.entries(MODE_META).map(([mode, meta]) => (
              <option key={mode} value={mode}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-black">{formatMonth(visibleDate)}</h2>
        <div className="text-sm font-semibold text-[#64748b]">
          Selected: {formatLongDate(selectedDate)}
        </div>
      </div>

      {view === 'week' ? (
        <WeekStrip
          selectedDate={selectedDate}
          appointmentsByDate={appointmentsByDate}
          onSelectDate={selectDate}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {view === 'month' ? (
            <MonthCalendar
              visibleDate={visibleDate}
              selectedDate={selectedDate}
              appointmentsByDate={appointmentsByDate}
              onSelectDate={selectDate}
              onSelectAppointment={selectAppointment}
            />
          ) : null}

          <AgendaList
            title={view === 'day' ? 'Day schedule' : 'Selected day'}
            appointments={selectedDayAppointments}
            selectedId={selectedAppointment?.id}
            onSelect={selectAppointment}
          />
        </div>

        <AppointmentDetails appointment={selectedAppointment} />
      </div>
    </div>
  )
}
