import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  FiActivity,
  FiAlertCircle,
  FiArrowUp,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'
import {
  appointmentDoctorTimezone,
  formatAppointmentDateTime,
  formatFee,
  isAppointmentUpcoming,
} from '../../../features/appointments/lib/format'
import { useDoctorTimezone } from '../../../features/appointments/hooks/useDoctorTimezone'
import type { DoctorAppointment } from '../../../features/appointments/types'
import { AnalyticsModal } from '../../../features/dashboard/components/AnalyticsModal'
import { DashboardHero } from '../../../features/dashboard/components/DashboardHero'
import { DashboardMetricCard } from '../../../features/dashboard/components/DashboardMetricCard'
import { DashboardSparkline } from '../../../features/dashboard/components/DashboardSparkline'
import { UpcomingAppointmentCard } from '../../../features/dashboard/components/UpcomingAppointmentCard'
import {
  DOCTOR_ANALYTICS_QUERY_KEY,
  DOCTOR_DASHBOARD_QUERY_KEY,
  getDoctorAnalytics,
  getDoctorDashboard,
} from '../../../features/dashboard/api/dashboardApi'
import {
  startAppointmentErrorMessage,
  useStartAppointment,
} from '../../../features/dashboard/hooks/useStartAppointment'
import { extractApiErrorMessage } from '../../../lib/apiClient'

function ScheduleRow({
  label,
  value,
  dotClass,
}: {
  label: string
  value: string
  dotClass: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-600">
        <span className={clsx('h-2 w-2 rounded-full', dotClass)} />
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  )
}

function PanelCard({
  icon,
  title,
  subtitle,
  children,
  action,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3edff] text-[#8a37ff]">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 flex-1">{children}</div>
      {action && <div className="mt-4 shrink-0">{action}</div>}
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-40 rounded-2xl bg-slate-200/80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="h-64 rounded-xl bg-slate-200/70" />
        <div className="h-64 rounded-xl bg-slate-200/70" />
      </div>
    </div>
  )
}

export function DashboardHomePage() {
  const { doctorTimezone: profileTimezone } = useDoctorTimezone()
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  const dashboardQuery = useQuery({
    queryKey: [DOCTOR_DASHBOARD_QUERY_KEY],
    queryFn: getDoctorDashboard,
  })

  const analyticsQuery = useQuery({
    queryKey: [DOCTOR_ANALYTICS_QUERY_KEY],
    queryFn: () => getDoctorAnalytics(),
  })

  const startMutation = useStartAppointment()

  const sparklineValues = useMemo(
    () => analyticsQuery.data?.per_day.map((d) => d.count) ?? [],
    [analyticsQuery.data?.per_day],
  )

  const upcomingAppointments = useMemo(() => {
    const dashboard = dashboardQuery.data
    if (!dashboard) return []

    const list: DoctorAppointment[] = []
    if (dashboard.today.next_appointment) {
      list.push(dashboard.today.next_appointment)
    }
    for (const item of dashboard.recent_appointments) {
      if (!list.some((a) => a.id === item.id) && isAppointmentUpcoming(item)) {
        list.push(item)
      }
    }
    return list.sort(
      (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
    )
  }, [dashboardQuery.data])

  const handleStart = (appointmentId: string) => {
    setStartError(null)
    startMutation.mutate(appointmentId, {
      onError: (err) => setStartError(startAppointmentErrorMessage(err)),
    })
  }

  const handleRefresh = () => {
    void dashboardQuery.refetch()
    void analyticsQuery.refetch()
  }

  if (dashboardQuery.isLoading) {
    return <DashboardSkeleton />
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-gradient-to-b from-red-50 to-white p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
          <FiAlertCircle className="h-7 w-7 text-red-600" />
        </div>
        <p className="mt-4 max-w-md text-sm text-red-700">
          {extractApiErrorMessage(dashboardQuery.error, 'Unable to load dashboard')}
        </p>
        <button
          type="button"
          onClick={() => void dashboardQuery.refetch()}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#8a37ff] px-5 text-sm font-semibold text-white transition hover:bg-[#772cf0]"
        >
          <FiRefreshCw className="h-4 w-4" />
          Try again
        </button>
      </section>
    )
  }

  const { doctor, today, queues, recent_appointments } = dashboardQuery.data
  const analytics = analyticsQuery.data
  const revenueLabel = analytics
    ? formatFee(analytics.revenue.amount, analytics.revenue.currency)
    : null

  return (
    <div className="space-y-5 pb-6">
      <DashboardHero
        doctorName={doctor.full_name}
        specialty={doctor.specialty}
        verificationStatus={doctor.verification_status}
        isRefreshing={dashboardQuery.isFetching}
        onRefresh={handleRefresh}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Today"
          value={today.appointment_count}
          subtitle={today.date ? `Scheduled · ${today.date}` : 'On your calendar'}
          icon={FiCalendar}
          accent="brand"
        />
        <DashboardMetricCard
          title="Pending review"
          value={queues.pending_approval}
          subtitle="Awaiting your approval"
          icon={FiClock}
          accent="amber"
        />
        <DashboardMetricCard
          title="Next 7 days"
          value={queues.upcoming_7d}
          subtitle={`${queues.confirmed_total} confirmed overall`}
          icon={FiTrendingUp}
          accent="emerald"
        />
        <DashboardMetricCard
          title="Practice status"
          value={doctor.is_active ? 'Active' : 'Paused'}
          subtitle={doctor.specialty ?? 'Your clinic'}
          icon={FiUsers}
          accent="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {analyticsQuery.isSuccess && analytics ? (
            <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Revenue · last 30 days
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {revenueLabel ?? '—'}
                  </p>
                  <p className="mt-1.5 text-sm text-slate-500">
                    From completed visits in this period
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAnalytics(true)}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 transition hover:border-[#8a37ff]/40 hover:bg-[#faf8ff] hover:text-[#8a37ff]"
                  >
                    <FiBarChart2 className="h-4 w-4" />
                    View full analytics
                  </button>
                </div>
                <DashboardSparkline values={sparklineValues} />
              </div>
            </section>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {analyticsQuery.isLoading
                ? 'Loading analytics…'
                : 'Analytics unavailable'}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <PanelCard
              icon={<FiCalendar className="h-5 w-5" />}
              title="Today's schedule"
              subtitle={
                today.next_appointment
                  ? 'Next visit is in your upcoming panel'
                  : `${today.appointment_count} visit${today.appointment_count === 1 ? '' : 's'} today`
              }
              action={
                <Link
                  to="/dashboard/calendar"
                  className="flex h-10 w-full items-center justify-center rounded-lg bg-[#8a37ff] text-sm font-semibold text-white transition hover:bg-[#772cf0]"
                >
                  Open calendar
                </Link>
              }
            >
              <div className="space-y-2">
                <ScheduleRow
                  label="Today"
                  value={`${today.appointment_count} visits`}
                  dotClass="bg-[#8a37ff]"
                />
                <ScheduleRow
                  label="Pending"
                  value={`${queues.pending_approval} to review`}
                  dotClass="bg-amber-500"
                />
                <ScheduleRow
                  label="This week"
                  value={`${queues.upcoming_7d} upcoming`}
                  dotClass="bg-emerald-600"
                />
              </div>
            </PanelCard>

            <PanelCard
              icon={<FiActivity className="h-5 w-5" />}
              title="Recent activity"
              subtitle="Latest visits on your practice"
              action={
                <Link
                  to="/dashboard/appointments"
                  className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition hover:border-[#8a37ff]/40 hover:text-[#8a37ff]"
                >
                  All appointments
                </Link>
              }
            >
              <div className="max-h-[200px] space-y-1 overflow-y-auto pr-1">
                {recent_appointments.length > 0 ? (
                  recent_appointments.slice(0, 6).map((item, index) => {
                    const tz = appointmentDoctorTimezone(item, profileTimezone)
                    return (
                      <div
                        key={item.id}
                        className="relative flex gap-3 rounded-lg px-2 py-2.5 transition hover:bg-slate-50"
                      >
                        {index < recent_appointments.length - 1 && (
                          <span
                            className="absolute left-[18px] top-9 bottom-0 w-px bg-slate-200"
                            aria-hidden
                          />
                        )}
                        <span className="relative z-[1] mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3edff] text-[#8a37ff] ring-4 ring-white">
                          <FiCheckCircle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {item.patient_name?.trim() || item.issue || 'Visit'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatAppointmentDateTime(item.starts_at, tz)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">
                    No recent appointments yet.
                  </p>
                )}
              </div>
            </PanelCard>

            {analytics && (
              <PanelCard
                icon={<FiArrowUp className="h-5 w-5" />}
                title="Performance snapshot"
                subtitle={`${analytics.range.from} – ${analytics.range.to}`}
                action={
                  <button
                    type="button"
                    onClick={() => setShowAnalytics(true)}
                    className="flex h-10 w-full items-center justify-center rounded-lg border border-[#e9d5ff] bg-[#faf8ff] text-sm font-semibold text-[#7c3aed] transition hover:bg-[#f3edff]"
                  >
                    View breakdown
                  </button>
                }
              >
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Done', value: analytics.totals.completed },
                    { label: 'Confirmed', value: analytics.totals.confirmed },
                    { label: 'Total', value: analytics.totals.appointments_total },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-center"
                    >
                      <p className="text-2xl font-bold text-slate-900">
                        {stat.value}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </PanelCard>
            )}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Upcoming appointments
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Confirmed visits · start calls from here
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3edff] text-[#8a37ff]">
                <FiClock className="h-5 w-5" />
              </div>
            </div>
            {today.next_appointment && (
              <p className="mt-3 rounded-lg border border-[#e9d5ff] bg-[#faf8ff] px-3 py-2 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Next patient · </span>
                <span className="font-semibold text-slate-900">
                  {today.next_appointment.patient_name?.trim() ||
                    today.next_appointment.issue ||
                    'Consultation'}
                </span>
              </p>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.slice(0, 8).map((appointment) => (
                <UpcomingAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  profileTimezone={profileTimezone}
                  expanded={expandedId === appointment.id}
                  onToggle={() =>
                    setExpandedId((id) =>
                      id === appointment.id ? null : appointment.id,
                    )
                  }
                  onStart={() => handleStart(appointment.id)}
                  isStarting={
                    startMutation.isPending &&
                    startMutation.variables === appointment.id
                  }
                  startError={
                    expandedId === appointment.id ? startError : null
                  }
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3edff] text-[#8a37ff]">
                  <FiCalendar className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  No upcoming visits
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  New bookings will appear here
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <Link
              to="/dashboard/appointments"
              className="flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold text-[#8a37ff] transition hover:bg-[#faf8ff]"
            >
              View all appointments →
            </Link>
          </div>
        </aside>
      </div>

      {showAnalytics && analytics && (
        <AnalyticsModal
          analytics={analytics}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  )
}
