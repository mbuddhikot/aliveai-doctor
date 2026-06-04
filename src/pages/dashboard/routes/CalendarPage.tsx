import { useEffect, useMemo, useState } from 'react'
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
  FiX,
} from 'react-icons/fi'
import {
  DOCTOR_APPOINTMENTS_QUERY_KEY,
  listDoctorAppointments,
} from '../../../features/appointments/api/appointmentsApi'
import { isAppointmentUpcoming } from '../../../features/appointments/lib/format'
import {
  isConfirmedAppointment,
  isPendingAppointment,
} from '../../../features/calendar/lib/mapDoctorAppointment'
import {
  startAppointmentErrorMessage,
  useStartAppointment,
} from '../../../features/dashboard/hooks/useStartAppointment'
import { useDoctorId } from '../../../features/appointments/hooks/useDoctorId'
import { useDoctorTimezone } from '../../../features/appointments/hooks/useDoctorTimezone'
import { extractApiErrorMessage } from '../../../lib/apiClient'
import {
  mapDoctorAppointmentsToCalendar,
  type CalendarStatusFilter,
} from '../../../features/calendar/lib/mapDoctorAppointment'
import { DEFAULT_PROFILE_TIMEZONE } from '../../../features/doctor-onboarding/constants'
import {
  addDaysToDateKey,
  addMonthsInZone,
  calendarMonthDayKeys,
  calendarMonthFromDateKey,
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
  CalendarAppointment,
  CalendarDisplayStatus,
} from '../../../features/calendar/types'

type CalendarView = 'month' | 'week' | 'day'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_META: Record<
  CalendarDisplayStatus,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-900 border-amber-200',
    dot: 'bg-amber-500',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'bg-[#f3edff] text-[#8a37ff] border-[#decaff]',
    dot: 'bg-[#8a37ff]',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-[#ecfdf5] text-[#047857] border-[#bbf7d0]',
    dot: 'bg-[#10b981]',
  },
  past: {
    label: 'Past',
    className: 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]',
    dot: 'bg-[#2563eb]',
  },
}

const STATUS_FILTER_OPTIONS: { value: CalendarStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'confirmed', label: 'Confirmed' },
]

const MODE_META: Record<AppointmentMode, { label: string; icon: ReactNode }> = {
  video: { label: 'Video call', icon: <FiVideo className="h-4 w-4" /> },
  clinic: { label: 'Clinic visit', icon: <FiMapPin className="h-4 w-4" /> },
  home: { label: 'Home visit', icon: <FiMapPin className="h-4 w-4" /> },
}

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function sortByTime(appointments: CalendarAppointment[]): CalendarAppointment[] {
  return [...appointments].sort(
    (a, b) => minutesFromTime(a.start) - minutesFromTime(b.start),
  )
}

function formatWeekRangeLabel(dateKey: string, timezone: string): string {
  const days = weekDayKeysAround(dateKey, timezone)
  const start = DateTime.fromISO(days[0], { zone: timezone })
  const end = DateTime.fromISO(days[6], { zone: timezone })
  if (start.month === end.month) {
    return `${start.toFormat('LLL d')} – ${end.toFormat('d, yyyy')}`
  }
  if (start.year === end.year) {
    return `${start.toFormat('LLL d')} – ${end.toFormat('LLL d, yyyy')}`
  }
  return `${start.toFormat('LLL d, yyyy')} – ${end.toFormat('LLL d, yyyy')}`
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

function StatusBadge({ status }: { status: CalendarDisplayStatus }) {
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
  const meta = STATUS_META[appointment.status]

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'block w-full truncate rounded border px-1 py-0.5 text-left text-[10px] font-semibold transition hover:opacity-90',
        meta.className,
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />
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

function DayAppointmentsPanel({
  title,
  subtitle,
  appointments,
  selectedId,
  onSelect,
}: {
  title: string
  subtitle: string
  appointments: CalendarAppointment[]
  selectedId?: string
  onSelect: (appointment: CalendarAppointment) => void
}) {
  return (
    <section className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-sm xl:min-h-0">
      <div className="shrink-0 border-b border-[#edf0f4] px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a37ff]">
              {title}
            </p>
            <h2 className="text-sm font-bold text-black">{subtitle}</h2>
          </div>
          <span className="shrink-0 text-xs text-[#64748b]">
            {appointments.length} slot{appointments.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div className="scrollbar-violet min-h-0 flex-1 space-y-1.5 overflow-y-scroll overscroll-contain p-2 pr-1">
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

const MODAL_TRANSITION_MS = 320

function SlotDetailsModal({
  isOpen,
  appointment,
  doctorTimezone,
  canJoinCall,
  joinUrl,
  isStartingCall,
  startCallError,
  onClose,
  onStartCall,
}: {
  isOpen: boolean
  appointment: CalendarAppointment
  doctorTimezone: string
  canJoinCall: boolean
  joinUrl?: string
  isStartingCall?: boolean
  startCallError?: string | null
  onClose: () => void
  onStartCall: () => void
}) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(false)
  const [displayed, setDisplayed] = useState(appointment)

  useEffect(() => {
    if (appointment) {
      setDisplayed(appointment)
    }
  }, [appointment])

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true))
      })
      return () => window.cancelAnimationFrame(frame)
    }

    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), MODAL_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  if (!mounted || !displayed) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close slot details"
        className={clsx(
          'absolute inset-0 bg-black/55 transition-opacity ease-out',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDuration: `${MODAL_TRANSITION_MS}ms` }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-details-title"
        className={clsx(
          'relative z-10 w-full max-w-md overflow-hidden rounded-[16px] border border-[#e6e8ee] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] transition-all ease-out',
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-3 scale-[0.98] opacity-0 sm:translate-y-2',
        )}
        style={{ transitionDuration: `${MODAL_TRANSITION_MS}ms` }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef1f5] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
              Slot details
            </p>
            <h2
              id="slot-details-title"
              className="mt-0.5 truncate text-lg font-bold text-black"
            >
              {appointment.patientName}
            </h2>
            {appointment.patientEmail ? (
              <p className="truncate text-sm text-[#64748b]">
                {appointment.patientEmail}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={appointment.status} />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#e6e8ee] text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="rounded-md bg-[#f8fafc] px-3 py-2.5 text-sm">
            <div className="font-bold text-[#111827]">
              {formatDoctorLongDate(appointment.date, doctorTimezone)}
            </div>
            <div className="text-[#64748b]">
              {formatWallClockTime(appointment.start)} –{' '}
              {formatWallClockTime(appointment.end)}
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[#64748b]">
              {MODE_META[appointment.mode].icon}
              {MODE_META[appointment.mode].label}
            </div>
          </div>

          <div className="rounded-md bg-[#f8fafc] px-3 py-2.5 text-sm">
            <div className="font-semibold text-[#64748b]">Reason</div>
            <div className="font-bold text-[#111827]">{appointment.reason}</div>
            {appointment.notes ? (
              <p className="mt-1 text-[#64748b]">{appointment.notes}</p>
            ) : null}
          </div>

          {startCallError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {startCallError}
            </p>
          ) : null}

          {canJoinCall ? (
            joinUrl ? (
              <a
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#111827] text-sm font-bold text-white transition hover:bg-black"
              >
                <FiVideo className="h-4 w-4" />
                Join call
              </a>
            ) : (
              <button
                type="button"
                disabled={isStartingCall}
                onClick={onStartCall}
                className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#111827] text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiVideo className="h-4 w-4" />
                {isStartingCall ? 'Starting…' : 'Join call'}
              </button>
            )
          ) : null}
        </div>
      </div>
    </div>
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
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('all')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>()
  const [slotDetailOpen, setSlotDetailOpen] = useState(false)
  const [modalAppointment, setModalAppointment] =
    useState<CalendarAppointment | null>(null)
  const [startCallError, setStartCallError] = useState<string | null>(null)

  const startCallMutation = useStartAppointment()

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

  const rawAppointments = appointmentsQuery.data?.data ?? []

  const appointments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sourceAppointments.filter((appointment) => {
      const matchesSearch =
        !query ||
        appointment.patientName.toLowerCase().includes(query) ||
        appointment.reason.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === 'all' || appointment.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [search, sourceAppointments, statusFilter])

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

  useEffect(() => {
    if (selectedDayAppointments.length === 0) {
      setSelectedAppointmentId(undefined)
      return
    }
    if (
      !selectedAppointmentId ||
      !selectedDayAppointments.some((item) => item.id === selectedAppointmentId)
    ) {
      setSelectedAppointmentId(selectedDayAppointments[0].id)
    }
  }, [selectedDayAppointments, selectedAppointmentId, statusFilter])

  const selectedAppointment =
    appointments.find((item) => item.id === selectedAppointmentId) ||
    selectedDayAppointments[0]

  const selectedDoctorAppointment = useMemo(() => {
    if (!selectedAppointment?.id) return undefined
    return rawAppointments.find((item) => item.id === selectedAppointment.id)
  }, [rawAppointments, selectedAppointment?.id])

  const isSelectedPending = Boolean(
    selectedDoctorAppointment &&
      isPendingAppointment(selectedDoctorAppointment),
  )

  const canJoinCall = Boolean(
    selectedDoctorAppointment &&
      !isSelectedPending &&
      isConfirmedAppointment(selectedDoctorAppointment) &&
      isAppointmentUpcoming(selectedDoctorAppointment),
  )

  const joinUrl =
    selectedDoctorAppointment?.join_url?.trim() ||
    selectedAppointment?.joinUrl ||
    undefined

  const todayKey = doctorTodayKey(doctorTimezone)
  const todayAppointments = appointments.filter(
    (appointment) => appointment.date === todayKey,
  )

  const statusCounts = useMemo(
    () => ({
      pending: sourceAppointments.filter((item) => item.status === 'pending')
        .length,
      upcoming: sourceAppointments.filter((item) => item.status === 'upcoming')
        .length,
      confirmed: sourceAppointments.filter((item) => item.status === 'confirmed')
        .length,
      past: sourceAppointments.filter((item) => item.status === 'past').length,
    }),
    [sourceAppointments],
  )

  const isOnToday = useMemo(() => {
    if (view === 'month') {
      const todayDt = DateTime.fromISO(todayKey, { zone: doctorTimezone })
      return (
        calendarMonth.year === todayDt.year &&
        calendarMonth.month === todayDt.month
      )
    }
    if (view === 'week') {
      return weekDayKeysAround(selectedDate, doctorTimezone).includes(todayKey)
    }
    return selectedDate === todayKey
  }, [view, calendarMonth, selectedDate, todayKey, doctorTimezone])

  const navLabel = useMemo(() => {
    if (view === 'month') {
      return formatDoctorMonthYear(
        calendarMonth.year,
        calendarMonth.month,
        doctorTimezone,
      )
    }
    if (view === 'week') {
      return formatWeekRangeLabel(selectedDate, doctorTimezone)
    }
    return formatDoctorLongDate(selectedDate, doctorTimezone)
  }, [view, calendarMonth, selectedDate, doctorTimezone])

  const visibleMonthLabel = formatDoctorMonthYear(
    calendarMonth.year,
    calendarMonth.month,
    doctorTimezone,
  )

  const selectedDayLabel = formatDoctorLongDate(selectedDate, doctorTimezone)

  const selectedDayMonth = calendarMonthFromDateKey(
    selectedDate,
    doctorTimezone,
  )
  const dayPanelTitle =
    selectedDate === todayKey
      ? 'Today'
      : formatDoctorMonthYear(
          selectedDayMonth.year,
          selectedDayMonth.month,
          doctorTimezone,
        )

  const goToToday = () => {
    const todayKeyValue = doctorTodayKey(doctorTimezone)
    setCalendarMonth(calendarMonthFromDateKey(todayKeyValue, doctorTimezone))
    setSelectedDate(todayKeyValue)
    setSelectedAppointmentId(undefined)
    setSlotDetailOpen(false)
    setView('month')
  }

  const navigatePrev = () => {
    if (view === 'month') {
      setCalendarMonth((prev) =>
        addMonthsInZone(prev.year, prev.month, -1, doctorTimezone),
      )
      return
    }
    if (view === 'week') {
      const newDate = addDaysToDateKey(selectedDate, -7, doctorTimezone)
      setSelectedDate(newDate)
      setSelectedAppointmentId(undefined)
      setSlotDetailOpen(false)
      const dt = DateTime.fromISO(newDate, { zone: doctorTimezone })
      if (dt.isValid) setCalendarMonth({ year: dt.year, month: dt.month })
      return
    }
    const newDate = addDaysToDateKey(selectedDate, -1, doctorTimezone)
    setSelectedDate(newDate)
    setSelectedAppointmentId(undefined)
    setSlotDetailOpen(false)
    const dt = DateTime.fromISO(newDate, { zone: doctorTimezone })
    if (dt.isValid) setCalendarMonth({ year: dt.year, month: dt.month })
  }

  const navigateNext = () => {
    if (view === 'month') {
      setCalendarMonth((prev) =>
        addMonthsInZone(prev.year, prev.month, 1, doctorTimezone),
      )
      return
    }
    if (view === 'week') {
      const newDate = addDaysToDateKey(selectedDate, 7, doctorTimezone)
      setSelectedDate(newDate)
      setSelectedAppointmentId(undefined)
      setSlotDetailOpen(false)
      const dt = DateTime.fromISO(newDate, { zone: doctorTimezone })
      if (dt.isValid) setCalendarMonth({ year: dt.year, month: dt.month })
      return
    }
    const newDate = addDaysToDateKey(selectedDate, 1, doctorTimezone)
    setSelectedDate(newDate)
    setSelectedAppointmentId(undefined)
    setSlotDetailOpen(false)
    const dt = DateTime.fromISO(newDate, { zone: doctorTimezone })
    if (dt.isValid) setCalendarMonth({ year: dt.year, month: dt.month })
  }

  const selectDate = (date: string) => {
    setCalendarMonth(calendarMonthFromDateKey(date, doctorTimezone))
    setSelectedDate(date)
    setSelectedAppointmentId(undefined)
    setSlotDetailOpen(false)
  }

  const selectAppointment = (appointment: CalendarAppointment) => {
    setSelectedDate(appointment.date)
    setSelectedAppointmentId(appointment.id)
    setModalAppointment(appointment)
    setStartCallError(null)
    setSlotDetailOpen(true)
  }

  const closeSlotDetail = () => {
    setSlotDetailOpen(false)
    setStartCallError(null)
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
          Your calendar shows pending, upcoming, and confirmed visits after
          onboarding is complete.
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
                label="pending"
                value={String(statusCounts.pending)}
                icon={<FiAlertCircle className="h-3.5 w-3.5" />}
              />
              <StatPill
                label="upcoming"
                value={String(statusCounts.upcoming)}
                icon={<FiCalendar className="h-3.5 w-3.5" />}
              />
              <StatPill
                label="confirmed"
                value={String(statusCounts.confirmed)}
                icon={<FiUser className="h-3.5 w-3.5" />}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={navigatePrev}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#253047] hover:bg-[#f8fafc]"
              aria-label="Previous"
            >
              <FiChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="hidden min-w-[120px] text-center text-xs font-bold text-black sm:inline">
              {navLabel}
            </span>
            <button
              type="button"
              onClick={navigateNext}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#253047] hover:bg-[#f8fafc]"
              aria-label="Next"
            >
              <FiChevronRight className="h-3.5 w-3.5" />
            </button>
            {!isOnToday ? (
              <button
                type="button"
                onClick={goToToday}
                className="h-7 rounded-md border border-[#dfe3ea] bg-white px-2.5 text-[11px] font-bold text-[#253047] transition hover:bg-[#f8fafc]"
              >
                Today
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <CalendarViewSearchBar
            view={view}
            onViewChange={setView}
            search={search}
            onSearchChange={setSearch}
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as CalendarStatusFilter)
            }
            className="h-8 w-full shrink-0 rounded-md border border-[#dfe3ea] bg-white px-2 text-[10px] font-semibold text-[#111827] outline-none focus:border-[#8a37ff] sm:w-[128px]"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          {(Object.keys(STATUS_META) as CalendarDisplayStatus[]).map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 text-[#64748b]"
            >
              <span
                className={clsx(
                  'h-2 w-2 rounded-full',
                  STATUS_META[status].dot,
                )}
              />
              {STATUS_META[status].label}
            </span>
          ))}
        </div>

        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs sm:hidden">
          <span className="font-bold text-black">{navLabel}</span>
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

      <div className="grid min-h-[min(560px,calc(100dvh-14rem))] grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-h-0">
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
          ) : (
            <DayAppointmentsPanel
              title={visibleMonthLabel}
              subtitle={selectedDayLabel}
              appointments={selectedDayAppointments}
              selectedId={selectedAppointment?.id}
              onSelect={selectAppointment}
            />
          )}
        </div>

        {view === 'month' ? (
          <DayAppointmentsPanel
            title={dayPanelTitle}
            subtitle={selectedDayLabel}
            appointments={selectedDayAppointments}
            selectedId={selectedAppointment?.id}
            onSelect={selectAppointment}
          />
        ) : null}
      </div>

      {modalAppointment ? (
        <SlotDetailsModal
          isOpen={slotDetailOpen}
          appointment={modalAppointment}
          doctorTimezone={doctorTimezone}
          canJoinCall={canJoinCall}
          joinUrl={joinUrl}
          isStartingCall={startCallMutation.isPending}
          startCallError={startCallError}
          onClose={closeSlotDetail}
          onStartCall={() => {
            if (!selectedDoctorAppointment) return
            setStartCallError(null)
            startCallMutation.mutate(selectedDoctorAppointment.id, {
              onError: (err) =>
                setStartCallError(startAppointmentErrorMessage(err)),
            })
          }}
        />
      ) : null}
    </div>
  )
}
