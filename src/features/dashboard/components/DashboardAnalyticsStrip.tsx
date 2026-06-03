import clsx from 'clsx'
import { FiBarChart2 } from 'react-icons/fi'
import type { DoctorAnalyticsResponse } from '../types'
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
  const sparklineValues = analytics?.per_day.map((d) => d.count) ?? []
  const completionRate =
    analytics && analytics.totals.appointments_total > 0
      ? Math.round(
          (analytics.totals.completed / analytics.totals.appointments_total) * 100,
        )
      : null

  return (
    <section
      className={clsx(
        'rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-6',
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
              {analytics.range.from} – {analytics.range.to}
            </p>
          ) : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3edff] text-[#8a37ff]">
          <FiBarChart2 className="h-5 w-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : analytics ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
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
          <DashboardSparkline values={sparklineValues} className="h-[72px] w-full min-w-[200px] lg:max-w-[220px]" />
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Analytics unavailable right now.
        </p>
      )}

      {analytics && analytics.top_issues.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-500">Top issues:</span>
          {analytics.top_issues.slice(0, 4).map((item) => (
            <span
              key={item.issue}
              className="rounded-full border border-[#e9d5ff] bg-[#faf8ff] px-2.5 py-1 text-xs font-medium text-[#7c3aed]"
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
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={clsx('mt-1 text-xl font-bold tracking-tight', valueTone)}>{value}</p>
    </div>
  )
}
