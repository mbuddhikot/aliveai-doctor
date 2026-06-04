import clsx from 'clsx'
import { FiBarChart2 } from 'react-icons/fi'
import type { DoctorAnalyticsResponse } from '../types'
import { formatAnalyticsDateRange } from '../lib/formatAnalyticsDate'
import { DashboardSparkline } from './DashboardSparkline'

type DashboardAnalyticsStripProps = {
  analytics: DoctorAnalyticsResponse | undefined
  isLoading: boolean
  className?: string
}

export function DashboardAnalyticsStrip({
  analytics,
  isLoading,
  className,
}: DashboardAnalyticsStripProps) {
  const perDay = analytics?.per_day ?? []
  const completionRate =
    analytics && analytics.totals.appointments_total > 0
      ? Math.round(
          (analytics.totals.completed / analytics.totals.appointments_total) * 100,
        )
      : null

  return (
    <section
      className={clsx(
        'overflow-visible rounded-2xl border border-slate-200/90 bg-white p-5 pb-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-6 sm:pb-7',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Practice analytics
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Last 30 days
          </h2>
          {analytics?.range.from && analytics?.range.to ? (
            <p className="mt-1 text-xs text-slate-500">
              {formatAnalyticsDateRange(analytics.range.from, analytics.range.to)}
            </p>
          ) : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3edff] text-[#8a37ff]">
          <FiBarChart2 className="h-5 w-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-5">
          <div className="mx-auto h-[180px] w-full max-w-[400px] animate-pulse rounded-xl bg-slate-100" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : analytics ? (
        <div className="mt-5 space-y-5">
          <div className="flex w-full justify-center px-2">
            <DashboardSparkline perDay={perDay} className="mx-auto" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBlock label="Total visits" value={analytics.totals.appointments_total} />
            <StatBlock label="Completed" value={analytics.totals.completed} accent="emerald" />
            <StatBlock label="Confirmed" value={analytics.totals.confirmed} accent="brand" />
            <StatBlock
              label="Completion"
              value={completionRate !== null ? `${completionRate}%` : '—'}
              accent="amber"
            />
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Analytics unavailable right now.
        </p>
      )}

      {analytics && analytics.top_issues.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="shrink-0 text-xs font-semibold leading-normal text-slate-500">
            Common Conditions:
          </span>
          {analytics.top_issues.slice(0, 4).map((item) => (
            <span
              key={item.issue}
              className="inline-flex items-center rounded-full border border-[#e9d5ff] bg-[#faf8ff] px-2.5 py-1.5 text-xs font-medium leading-normal text-[#7c3aed]"
            >
              {item.issue} · {item.count}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function StatBlock({
  label,
  value,
  accent = 'slate',
}: {
  label: string
  value: string | number
  accent?: 'slate' | 'brand' | 'emerald' | 'amber'
}) {
  const valueTone = {
    slate: 'text-slate-900',
    brand: 'text-[#7c3aed]',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  }[accent]

  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="max-w-full text-[9px] font-semibold uppercase leading-snug tracking-tight text-slate-500 [overflow-wrap:anywhere]">
        {label}
      </p>
      <p className={clsx('mt-1 text-xl font-bold tracking-tight', valueTone)}>{value}</p>
    </div>
  )
}
