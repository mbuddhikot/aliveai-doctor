import { FiX } from 'react-icons/fi'
import type { DoctorAnalyticsResponse } from '../types'
import { formatFee } from '../../appointments/lib/format'
import { formatAnalyticsDateRange } from '../lib/formatAnalyticsDate'

type AnalyticsModalProps = {
  analytics: DoctorAnalyticsResponse
  onClose: () => void
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#f8fafc] px-3 py-2 text-sm">
      <span className="text-[#64748b]">{label}</span>
      <span className="font-bold text-[#111827]">{value}</span>
    </div>
  )
}

export function AnalyticsModal({ analytics, onClose }: AnalyticsModalProps) {
  const revenue = formatFee(
    analytics.revenue.amount,
    analytics.revenue.currency,
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close analytics"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] border border-[#e6e8ee] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#eef1f5] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-black">Practice analytics</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              {formatAnalyticsDateRange(analytics.range.from, analytics.range.to)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e6e8ee] text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-[12px] border border-[#decaff] bg-[#f3edff] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8a37ff]">
              Revenue earned
            </p>
            <p className="mt-1 text-3xl font-bold text-black">{revenue ?? '—'}</p>
            <p className="mt-1 text-xs text-[#64748b]">
              From completed appointments in this period
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-[#111827]">Appointments</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <StatRow label="Total" value={analytics.totals.appointments_total} />
              <StatRow label="Completed" value={analytics.totals.completed} />
              <StatRow label="Confirmed" value={analytics.totals.confirmed} />
              <StatRow label="In progress" value={analytics.totals.in_progress} />
              <StatRow label="Pending" value={analytics.totals.pending} />
              <StatRow label="Cancelled" value={analytics.totals.cancelled} />
              <StatRow label="Rejected" value={analytics.totals.rejected} />
            </div>
          </div>

          {analytics.top_issues.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-[#111827]">Common Conditions</h3>
              <div className="space-y-2">
                {analytics.top_issues.slice(0, 8).map((item) => (
                  <div
                    key={item.issue}
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-[#edf0f4] px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium text-[#253047]">
                      {item.issue}
                    </span>
                    <span className="shrink-0 font-bold text-[#8a37ff]">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.per_day.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-[#111827]">Daily volume</h3>
              <div className="flex items-end gap-1 rounded-[10px] border border-[#edf0f4] bg-[#fafafa] p-3">
                {analytics.per_day.slice(-14).map((day) => {
                  const max = Math.max(
                    ...analytics.per_day.map((d) => d.count),
                    1,
                  )
                  const height = Math.max(8, (day.count / max) * 72)
                  return (
                    <div
                      key={day.date}
                      className="flex flex-1 flex-col items-center gap-1"
                      title={`${day.date}: ${day.count}`}
                    >
                      <div
                        className="w-full max-w-[20px] rounded-t bg-[#8a37ff]"
                        style={{ height }}
                      />
                      <span className="text-[9px] text-[#94a3b8]">
                        {day.date.slice(8)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
