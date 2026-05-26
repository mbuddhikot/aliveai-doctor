import clsx from 'clsx'
import type { IconType } from 'react-icons'

type Accent = 'brand' | 'amber' | 'emerald' | 'slate'

const accentStyles: Record<
  Accent,
  { orb: string; ring: string; subtitle: string }
> = {
  brand: {
    orb: 'bg-[#f3edff] text-[#8a37ff]',
    ring: 'ring-[#e9d5ff]',
    subtitle: 'text-[#7c3aed]',
  },
  amber: {
    orb: 'bg-amber-50 text-amber-700',
    ring: 'ring-amber-100',
    subtitle: 'text-amber-800',
  },
  emerald: {
    orb: 'bg-emerald-50 text-emerald-700',
    ring: 'ring-emerald-100',
    subtitle: 'text-emerald-800',
  },
  slate: {
    orb: 'bg-slate-100 text-slate-600',
    ring: 'ring-slate-200',
    subtitle: 'text-slate-600',
  },
}

type DashboardMetricCardProps = {
  title: string
  value: string | number
  subtitle?: string
  icon: IconType
  accent?: Accent
  className?: string
}

export function DashboardMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'brand',
  className,
}: DashboardMetricCardProps) {
  const styles = accentStyles[accent]

  return (
    <article
      className={clsx(
        'rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {subtitle && (
            <p className={clsx('mt-1.5 text-sm font-medium', styles.subtitle)}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-2 ring-inset',
            styles.orb,
            styles.ring,
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </article>
  )
}
