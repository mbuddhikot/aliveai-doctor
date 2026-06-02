import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  FiActivity,
  FiAlertCircle,
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
  isAppointmentUpcoming,
} from '../../../features/appointments/lib/format'
import { useDoctorTimezone } from '../../../features/appointments/hooks/useDoctorTimezone'
import type { DoctorAppointment } from '../../../features/appointments/types'
import { DashboardAnalyticsStrip } from '../../../features/dashboard/components/DashboardAnalyticsStrip'
import { DashboardHero } from '../../../features/dashboard/components/DashboardHero'
import { DashboardMetricCard } from '../../../features/dashboard/components/DashboardMetricCard'
import { DashboardPatientsStrip } from '../../../features/dashboard/components/DashboardPatientsStrip'
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
import {
  DOCTOR_PATIENTS_QUERY_KEY,
  listDoctorPatients,
} from '../../../features/patients/api/patientsApi'
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
  className,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={clsx(
        'flex h-full min-h-[380px] flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]',
        className,
      )}
    >
      <div className="flex shrink-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3edff] text-[#8a37ff]">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-hidden">{children}</div>
      {action ? <div className="mt-4 shrink-0">{action}</div> : null}
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-6 pb-8">
      <div className="h-24 rounded-xl bg-slate-200/80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="h-44 rounded-2xl bg-slate-200/70" />
        <div className="h-44 rounded-2xl bg-slate-200/70" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[380px] rounded-2xl bg-slate-200/70" />
        ))}
      </div>
    </div>
  )
}

export function DashboardHomePage() {
  const { doctorTimezone: profileTimezone } = useDoctorTimezone()
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

  const patientsQuery = useQuery({
    queryKey: [DOCTOR_PATIENTS_QUERY_KEY, 'dashboard-preview'],
    queryFn: () => listDoctorPatients({ limit: 8, offset: 0 }),
    staleTime: 60_000,
  })

  const startMutation = useStartAppointment()

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
    void Promise.all([
      dashboardQuery.refetch(),
      analyticsQuery.refetch(),
      patientsQuery.refetch(),
    ])
  }

  const isRefreshing =
    dashboardQuery.isFetching ||
    analyticsQuery.isFetching ||
    patientsQuery.isFetching

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
          onClick={() => void handleRefresh()}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#8a37ff] px-5 text-sm font-semibold text-white transition hover:bg-[#772cf0]"
        >
          <FiRefreshCw className="h-4 w-4" />
          Try again
        </button>
      </section>
    )
  }

  const { doctor, today, queues, recent_appointments } = dashboardQuery.data
  const patientTotal = patientsQuery.data?.total ?? 0
  const patientPreview = patientsQuery.data?.data ?? []

  return (
    <div className="w-full pb-8">
      <div className="sticky top-0 z-20 -mx-4 mb-6 bg-gradient-to-b from-[#f8f9ff] from-90% to-[#f4f6fb] px-4 pb-3 pt-0 shadow-[0_6px_16px_-8px_rgba(15,23,42,0.12)] md:-mx-9 md:px-9">
        <DashboardHero
          doctorName={doctor.full_name}
          specialty={doctor.specialty}
          verificationStatus={doctor.verification_status}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="space-y-6">
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
          title="Patients"
          value={patientsQuery.isLoading ? '…' : patientTotal}
          subtitle="In your practice"
          icon={FiUsers}
          accent="slate"
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <DashboardAnalyticsStrip
          analytics={analyticsQuery.data}
          isLoading={analyticsQuery.isLoading}
          className="h-full min-h-[220px]"
        />
        <DashboardPatientsStrip
          patients={patientPreview}
          total={patientTotal}
          isLoading={patientsQuery.isLoading}
          className="min-h-[220px]"
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-3">
        <PanelCard
          icon={<FiCalendar className="h-5 w-5" />}
          title="Today's schedule"
          subtitle={
            today.next_appointment
              ? 'Next visit is in upcoming appointments'
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
            {doctor.is_active ? (
              <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs font-medium text-emerald-800">
                Practice is active and accepting bookings
              </p>
            ) : (
              <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs font-medium text-amber-800">
                Practice is paused
              </p>
            )}
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
          <div className="h-full max-h-[280px] space-y-1 overflow-y-auto pr-1">
            {recent_appointments.length > 0 ? (
              recent_appointments.slice(0, 8).map((item, index) => {
                const tz = appointmentDoctorTimezone(item, profileTimezone)
                return (
                  <div
                    key={item.id}
                    className="relative flex gap-3 rounded-lg px-2 py-2.5 transition hover:bg-slate-50"
                  >
                    {index < Math.min(recent_appointments.length, 8) - 1 && (
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

        <PanelCard
          icon={<FiClock className="h-5 w-5" />}
          title="Upcoming appointments"
          subtitle="Start visits from here"
          action={
            <Link
              to="/dashboard/appointments"
              className="flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold text-[#8a37ff] transition hover:bg-[#faf8ff]"
            >
              View all appointments →
            </Link>
          }
        >
          {today.next_appointment ? (
            <p className="mb-3 shrink-0 rounded-lg border border-[#e9d5ff] bg-[#faf8ff] px-3 py-2 text-xs text-slate-600">
              <span className="font-medium text-slate-500">Next patient · </span>
              <span className="font-semibold text-slate-900">
                {today.next_appointment.patient_name?.trim() ||
                  today.next_appointment.issue ||
                  'Consultation'}
              </span>
            </p>
          ) : null}

          <div className="h-full max-h-[280px] space-y-2.5 overflow-y-auto pr-1">
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
        </PanelCard>
      </div>
      </div>
    </div>
  )
}
