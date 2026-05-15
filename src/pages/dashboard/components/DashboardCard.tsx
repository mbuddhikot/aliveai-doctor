import clsx from 'clsx'
import type { ReactNode } from 'react'

type DashboardCardProps = {
  title: string
  value?: string
  trend?: string
  children?: ReactNode
  className?: string
  bodyClassName?: string
}

export function DashboardCard({
  title,
  value,
  trend,
  children,
  className,
  bodyClassName,
}: DashboardCardProps) {
  return (
    <div
      className={clsx(
        'rounded-md border border-[#dfe3ea] bg-white p-6 shadow-[0_12px_30px_rgba(31,41,55,0.04)]',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xl font-semibold leading-tight text-[#111827]">{title}</div>
          {value != null ? (
            <div className="mt-8 text-[40px] font-bold leading-none text-black">
              {value}
            </div>
          ) : null}
          {trend ? (
            <div className="mt-6 text-base font-semibold text-[#26b76a]">
              {trend}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-3xl font-bold leading-none text-black hover:bg-slate-100"
          aria-label="More options"
        >
          …
        </button>
      </div>

      {children ? <div className={clsx('mt-3', bodyClassName)}>{children}</div> : null}
    </div>
  )
}
