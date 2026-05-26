import { Link } from 'react-router-dom'
import clsx from 'clsx'
import {
  FiCalendar,
  FiClipboard,
  FiClock,
  FiRefreshCw,
  FiShield,
} from 'react-icons/fi'
import { formatDoctorDisplayName } from '../lib/formatDoctorName'

type DashboardHeroProps = {
  doctorName: string
  specialty?: string | null
  verificationStatus: string
  isRefreshing: boolean
  onRefresh: () => void
}

function verificationLabel(status: string): { text: string; tone: string } {
  switch (status) {
    case 'verified':
      return {
        text: 'Verified practitioner',
        tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
      }
    case 'pending':
      return {
        text: 'Verification pending',
        tone: 'bg-amber-50 text-amber-800 ring-amber-200',
      }
    case 'rejected':
      return {
        text: 'Profile action required',
        tone: 'bg-rose-50 text-rose-800 ring-rose-200',
      }
    default:
      return {
        text: 'Complete your profile',
        tone: 'bg-slate-100 text-slate-700 ring-slate-200',
      }
  }
}

const quickLinks = [
  { to: '/dashboard/appointments', label: 'Appointments', icon: FiClipboard },
  { to: '/dashboard/calendar', label: 'Calendar', icon: FiCalendar },
  { to: '/dashboard/availability', label: 'Availability', icon: FiClock },
] as const

export function DashboardHero({
  doctorName,
  specialty,
  verificationStatus,
  isRefreshing,
  onRefresh,
}: DashboardHeroProps) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const badge = verificationLabel(verificationStatus)
  const { displayName, initials } = formatDoctorDisplayName(doctorName)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8a37ff] via-[#7c3aed] to-[#6366f1]"
        aria-hidden
      />

      <div className="relative px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8a37ff] to-[#6d28d9] text-base font-bold text-white shadow-[0_8px_20px_rgba(138,55,255,0.28)] sm:h-16 sm:w-16 sm:text-lg"
              aria-hidden
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {today}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Welcome back
              </p>
              <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
                {displayName}
              </h1>
              {specialty ? (
                <p className="mt-1 text-sm font-medium text-[#8a37ff]">
                  {specialty}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">Physician dashboard</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                    badge.tone,
                  )}
                >
                  <FiShield className="h-3.5 w-3.5 shrink-0" />
                  {badge.text}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={onRefresh}
            className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:border-[#8a37ff]/40 hover:bg-white hover:text-[#8a37ff] disabled:opacity-60 lg:self-center"
          >
            <FiRefreshCw
              className={clsx('h-4 w-4', isRefreshing && 'animate-spin')}
            />
            Refresh data
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          {quickLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 transition hover:border-[#8a37ff]/35 hover:bg-[#faf8ff] hover:text-[#7c3aed]"
            >
              <Icon className="h-3.5 w-3.5 text-[#8a37ff]" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
