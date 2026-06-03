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
    <section className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-[#f7f5ff] shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#8a37ff] via-[#7c3aed] to-[#6366f1]"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8a37ff] to-[#6d28d9] text-sm font-bold text-white shadow-[0_4px_12px_rgba(138,55,255,0.25)]"
          aria-hidden
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {today}
          </p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              {displayName}
            </h1>
            {specialty ? (
              <span className="text-sm font-medium text-[#8a37ff]">{specialty}</span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                badge.tone,
              )}
            >
              <FiShield className="h-3 w-3 shrink-0" />
              {badge.text}
            </span>
            {quickLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white/80 px-2 text-[11px] font-semibold text-slate-600 transition hover:border-[#8a37ff]/35 hover:text-[#7c3aed]"
              >
                <Icon className="h-3 w-3 text-[#8a37ff]" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={isRefreshing}
          onClick={onRefresh}
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#8a37ff]/40 hover:text-[#8a37ff] disabled:opacity-60"
        >
          <FiRefreshCw
            className={clsx('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </section>
  )
}
