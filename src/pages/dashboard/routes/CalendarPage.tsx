import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { DateTime } from 'luxon'
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
  DOCTOR_APPOINTMENTS_QUERY_KEY,
  listDoctorAppointments,
} from '../../../features/appointments/api/appointmentsApi'
import { useDoctorId } from '../../../features/appointments/hooks/useDoctorId'
import { useDoctorTimezone } from '../../../features/appointments/hooks/useDoctorTimezone'
import { mapDoctorAppointmentsToCalendar } from '../../../features/calendar/lib/mapDoctorAppointment'
import { DEFAULT_PROFILE_TIMEZONE } from '../../../features/doctor-onboarding/constants'
import {
  addMonthsInZone,
  calendarMonthDayKeys,
  dayOfMonthInZone,
  doctorTodayKey,
  formatDoctorLongDate,
  formatDoctorMonthYear,
  formatWallClockTime,
  monthOfDateKey,
  weekdayShortInZone,
  weekDayKeysAround,
} from '../../../lib/doctorTimezone'
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

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function isUpcomingInDoctorZone(
  appointment: CalendarAppointment,
  doctorTimezone: string,
): boolean {
  const local = DateTime.fromISO(`${appointment.date}T${appointment.start}`, {
    zone: doctorTimezone,
  })
  if (!local.isValid) return false
  return local.toUTC().toMillis() >= Date.now() && appointment.status !== 'cancelled'
}

function sortByTime(appointments: CalendarAppointment[]): CalendarAppointment[] {
  return [...appointments].sort(
    (a, b) => minutesFromTime(a.start) - minutesFromTime(b.start),
  )
}

function StatPill({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[#dfe3ea] bg-[#f8fafc] px-2 py-1 text-xs">
      <span className="text-[#8a37ff]">{icon}</span>
      <span className="font-bold text-black">{value}</span>
      <span className="text-[#64748b]">{label}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1.5 rounded border px-2 text-[10px] font-bold',
        meta.className,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

const VIEW_TABS: { id: CalendarView; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
]

function CalendarViewSearchBar({
  view,
  onViewChange,
  search,
  onSearchChange,
}: {
  view: CalendarView
  onViewChange: (value: CalendarView) => void
  search: string
  onSearchChange: (value: string) => void
}) {
  return (
    <div className="flex h-8 min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-[#dfe3ea] bg-white focus-within:border-[#8a37ff] focus-within:ring-1 focus-within:ring-[#8a37ff]/25">
      <div
        className="flex shrink-0 items-stretch border-r border-[#dfe3ea] bg-[#f8fafc]"
        role="tablist"
        aria-label="Calendar view"
      >
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => onViewChange(tab.id)}
            className={clsx(
              'px-2.5 text-[10px] font-bold transition sm:px-3 sm:text-[11px]',
              view === tab.id
                ? 'bg-white text-[#8a37ff]'
                : 'text-[#64748b] hover:bg-white/60 hover:text-[#111827]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <label className="relative flex min-w-0 flex-1 items-center">
        <FiSearch
          className="pointer-events-none absolute left-2 h-3 w-3 text-[#94a3b8]"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search patient or reason"
          className="h-full w-full min-w-0 border-0 bg-transparent py-0 pl-7 pr-2 text-xs text-[#111827] outline-none placeholder:text-[#94a3b8] focus:ring-0"
        />
      </label>
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
      className="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-semibold text-[#253047] transition hover:bg-[#f3edff]"
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
  visibleYear,
  visibleMonth,
  doctorTimezone,
  selectedDate,
  appointmentsByDate,
  onSelectDate,
  onSelectAppointment,
}: {
  visibleYear: number
  visibleMonth: number
  doctorTimezone: string
  selectedDate: string
  appointmentsByDate: Map<string, CalendarAppointment[]>
  onSelectDate: (date: string) => void
  onSelectAppointment: (appointment: CalendarAppointment) => void
}) {
  const days = calendarMonthDayKeys(visibleYear, visibleMonth, doctorTimezone)
  const todayKey = doctorTodayKey(doctorTimezone)

  return (
    <section className="overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-[#edf0f4] bg-[#f8fafc]">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-[#64748b]"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((key) => {
          const dayAppointments = sortByTime(appointmentsByDate.get(key) || [])
          const isMuted = monthOfDateKey(key, doctorTimezone) !== visibleMonth
          const isSelected = key === selectedDate

          return (
            <div
              key={key}
              className={clsx(
                'min-h-[76px] border-b border-r border-[#edf0f4] p-1 last:border-r-0 sm:min-h-[84px]',
                isSelected && 'bg-[#faf7ff]',
                isMuted && 'bg-[#fbfcfe]',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate(key)}
                className={clsx(
                  'inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold transition sm:h-7 sm:w-7',
                  key === todayKey
                    ? 'bg-[#8a37ff] text-white'
                    : isSelected
                      ? 'bg-[#f3edff] text-[#8a37ff]'
                      : isMuted
                        ? 'text-[#a0a7b2] hover:bg-white'
                        : 'text-[#253047] hover:bg-[#f8fafc]',
                )}
              >
                {dayOfMonthInZone(key, doctorTimezone)}
              </button>

              <div className="mt-0.5 space-y-0.5">
                {dayAppointments.slice(0, 2).map((appointment) => (
                  <AppointmentPill
                    key={appointment.id}
                    appointment={appointment}
                    onClick={() => onSelectAppointment(appointment)}
                  />
                ))}
                {dayAppointments.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => onSelectDate(key)}
                    className="px-1 text-[10px] font-bold text-[#8a37ff]"
                  >
                    +{dayAppointments.length - 2}
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
    <section className="rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#edf0f4] px-3 py-2">
        <h2 className="text-sm font-bold text-black">{title}</h2>
        <span className="text-xs text-[#64748b]">{appointments.length} slots</span>
      </div>
      <div className="max-h-[200px] space-y-1.5 overflow-auto p-2 sm:max-h-[240px]">
        {appointments.length > 0 ? (
          sortByTime(appointments).map((appointment) => (
            <button
              key={appointment.id}
              type="button"
              onClick={() => onSelect(appointment)}
              className={clsx(
                'w-full rounded-md border px-2.5 py-2 text-left transition',
                selectedId === appointment.id
                  ? 'border-[#8a37ff] bg-[#faf7ff]'
                  : 'border-[#edf0f4] bg-white hover:border-[#cfd6e1] hover:bg-[#fbfcfe]',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-black">
                    {appointment.patientName}
                  </div>
                  <div className="text-[11px] text-[#64748b]">
                    {formatWallClockTime(appointment.start)} –{' '}
                    {formatWallClockTime(appointment.end)}
                  </div>
                </div>
                <StatusBadge status={appointment.status} />
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-[#cfd6e1] bg-[#fbfcfe] px-3 py-4 text-center text-xs text-[#64748b]">
            No slots on this day.
          </div>
        )}
      </div>
    </section>
  )
}

function AppointmentDetails({
  appointment,
  doctorTimezone,
}: {
  appointment?: CalendarAppointment
  doctorTimezone: string
}) {
  return (
    <section className="rounded-lg border border-[#dfe3ea] bg-white shadow-sm xl:sticky xl:top-2 xl:self-start">
      <div className="border-b border-[#edf0f4] px-3 py-2">
        <h2 className="text-sm font-bold text-black">Slot details</h2>
      </div>
      {appointment ? (
        <div className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-black">
                {appointment.patientName}
              </h3>
              {appointment.patientEmail ? (
                <p className="truncate text-xs text-[#64748b]">
                  {appointment.patientEmail}
                </p>
              ) : null}
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          <div className="rounded-md bg-[#f8fafc] px-2.5 py-2 text-xs">
            <div className="font-bold text-[#111827]">
              {formatDoctorLongDate(appointment.date, doctorTimezone)}
            </div>
            <div className="text-[#64748b]">
              {formatWallClockTime(appointment.start)} –{' '}
              {formatWallClockTime(appointment.end)}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-[#64748b]">
              {MODE_META[appointment.mode].icon}
              {MODE_META[appointment.mode].label}
            </div>
          </div>

          <div className="rounded-md bg-[#f8fafc] px-2.5 py-2 text-xs">
            <div className="font-semibold text-[#64748b]">Reason</div>
            <div className="font-bold text-[#111827]">{appointment.reason}</div>
            {appointment.notes ? (
              <p className="mt-1 text-[#64748b]">{appointment.notes}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="h-8 rounded-md border border-[#dfe3ea] bg-white text-xs font-bold text-[#253047] transition hover:bg-[#f8fafc]"
            >
              Reschedule
            </button>
            <button
              type="button"
              className="h-8 rounded-md bg-[#8a37ff] text-xs font-bold text-white transition hover:bg-[#772cf0]"
            >
              Start visit
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <div className="rounded-md border border-dashed border-[#cfd6e1] bg-[#fbfcfe] px-3 py-4 text-center text-xs text-[#64748b]">
            Select a slot for details.
          </div>
        </div>
      )}
    </section>
  )
}

function WeekStrip({
  selectedDate,
  doctorTimezone,
  appointmentsByDate,
  onSelectDate,
}: {
  selectedDate: string
  doctorTimezone: string
  appointmentsByDate: Map<string, CalendarAppointment[]>
  onSelectDate: (date: string) => void
}) {
  const days = weekDayKeysAround(selectedDate, doctorTimezone)

  return (
    <section className="rounded-lg border border-[#dfe3ea] bg-white p-2 shadow-sm">
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {days.map((key) => {
          const count = appointmentsByDate.get(key)?.length || 0
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={clsx(
                'rounded-md border px-2 py-1.5 text-left transition',
                key === selectedDate
                  ? 'border-[#8a37ff] bg-[#faf7ff]'
                  : 'border-[#edf0f4] bg-white hover:bg-[#f8fafc]',
              )}
            >
              <div className="text-[10px] font-bold uppercase text-[#64748b]">
                {weekdayShortInZone(key, doctorTimezone)}
              </div>
              <div className="text-lg font-bold leading-tight text-black">
                {dayOfMonthInZone(key, doctorTimezone)}
              </div>
              {count > 0 ? (
                <div className="text-[10px] font-bold text-[#8a37ff]">{count}</div>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function initialCalendarMonth(timezone: string) {
  const now = DateTime.now().setZone(timezone)
  return { year: now.year, month: now.month }
}

export function CalendarPage() {
  const { doctorId, isLoading: doctorIdLoading, isError: doctorIdError } =
    useDoctorId()
  const { doctorTimezone } = useDoctorTimezone()
  const [calendarMonth, setCalendarMonth] = useState(() =>
    initialCalendarMonth(DEFAULT_PROFILE_TIMEZONE),
  )
  const [selectedDate, setSelectedDate] = useState(() =>
    doctorTodayKey(DEFAULT_PROFILE_TIMEZONE),
  )
  const [view, setView] = useState<CalendarView>('month')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>()

  const appointmentsQuery = useQuery({
    queryKey: [DOCTOR_APPOINTMENTS_QUERY_KEY, doctorId],
    queryFn: () => listDoctorAppointments({ doctorId: doctorId! }),
    enabled: Boolean(doctorId),
  })

  const sourceAppointments = useMemo(
    () =>
      mapDoctorAppointmentsToCalendar(
        appointmentsQuery.data?.data ?? [],
        doctorTimezone,
      ),
    [appointmentsQuery.data?.data, doctorTimezone],
  )

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

  const todayKey = doctorTodayKey(doctorTimezone)
  const todayAppointments = appointments.filter(
    (appointment) => appointment.date === todayKey,
  )
  const upcomingAppointments = appointments.filter((appointment) =>
    isUpcomingInDoctorZone(appointment, doctorTimezone),
  )
  const confirmedCount = appointments.length

  const goToToday = () => {
    const todayKeyValue = doctorTodayKey(doctorTimezone)
    setCalendarMonth(initialCalendarMonth(doctorTimezone))
    setSelectedDate(todayKeyValue)
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
          Your calendar shows confirmed upcoming visits after onboarding is
          complete.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-2">
      <section className="rounded-lg border border-[#dfe3ea] bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-black sm:text-lg">
              Calendar
            </h1>
            <div className="flex flex-wrap gap-1.5">
              <StatPill
                label="today"
                value={String(todayAppointments.length)}
                icon={<FiClock className="h-3.5 w-3.5" />}
              />
              <StatPill
                label="upcoming"
                value={String(upcomingAppointments.length)}
                icon={<FiCalendar className="h-3.5 w-3.5" />}
              />
              <StatPill
                label="confirmed"
                value={String(confirmedCount)}
                icon={<FiUser className="h-3.5 w-3.5" />}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((prev) =>
                  addMonthsInZone(prev.year, prev.month, -1, doctorTimezone),
                )
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#253047] hover:bg-[#f8fafc]"
              aria-label="Previous month"
            >
              <FiChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="h-7 rounded-md border border-[#dfe3ea] bg-white px-2.5 text-[11px] font-bold text-[#253047] hover:bg-[#f8fafc]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((prev) =>
                  addMonthsInZone(prev.year, prev.month, 1, doctorTimezone),
                )
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#253047] hover:bg-[#f8fafc]"
              aria-label="Next month"
            >
              <FiChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <CalendarViewSearchBar
            view={view}
            onViewChange={setView}
            search={search}
            onSearchChange={setSearch}
          />
          <div className="flex shrink-0 gap-1.5">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="h-8 min-w-0 flex-1 rounded-md border border-[#dfe3ea] bg-white px-2 text-[10px] font-semibold text-[#111827] outline-none focus:border-[#8a37ff] sm:w-[112px] sm:flex-none"
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
              className="h-8 min-w-0 flex-1 rounded-md border border-[#dfe3ea] bg-white px-2 text-[10px] font-semibold text-[#111827] outline-none focus:border-[#8a37ff] sm:w-[100px] sm:flex-none"
            >
              <option value="all">All modes</option>
              {Object.entries(MODE_META).map(([mode, meta]) => (
                <option key={mode} value={mode}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
          <span className="font-bold text-black">
            {formatDoctorMonthYear(
              calendarMonth.year,
              calendarMonth.month,
              doctorTimezone,
            )}
          </span>
          <span className="text-[#64748b]">
            {formatDoctorLongDate(selectedDate, doctorTimezone)}
          </span>
        </div>

        {appointmentsQuery.isError ? (
          <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">
            Unable to load appointments. Refresh to try again.
          </div>
        ) : null}
        {appointmentsQuery.isLoading ? (
          <div className="mt-2 text-xs text-[#64748b]">Loading…</div>
        ) : null}
      </section>

      {view === 'week' ? (
        <WeekStrip
          selectedDate={selectedDate}
          doctorTimezone={doctorTimezone}
          appointmentsByDate={appointmentsByDate}
          onSelectDate={selectDate}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-2">
          {view === 'month' ? (
            <MonthCalendar
              visibleYear={calendarMonth.year}
              visibleMonth={calendarMonth.month}
              doctorTimezone={doctorTimezone}
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

        <AppointmentDetails
          appointment={selectedAppointment}
          doctorTimezone={doctorTimezone}
        />
      </div>
    </div>
  )
}
