import { useId, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { AnalyticsPerDay } from '../types'
import { formatDayMonthYear } from '../lib/formatAnalyticsDate'

type DashboardSparklineProps = {
  perDay: AnalyticsPerDay[]
  className?: string
}

function shortAxisDate(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim())
  if (match) return `${match[3]}/${match[2]}`
  const formatted = formatDayMonthYear(dateStr)
  const parts = formatted.split('/')
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`
  return formatted
}

function axisLabelIndices(length: number): number[] {
  if (length <= 1) return length === 1 ? [0] : []
  if (length === 2) return [0, length - 1]
  const mid = Math.floor((length - 1) / 2)
  return [0, mid, length - 1]
}

export function DashboardSparkline({
  perDay,
  className,
}: DashboardSparklineProps) {
  const gradientId = useId().replace(/:/g, '')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const chart = useMemo(() => {
    const days = perDay
    const values = days.map((d) => d.count)
    const max = Math.max(...values, 1)
    const width = 380
    const height = 120
    const pad = { top: 14, right: 14, bottom: 10, left: 14 }
    const innerW = width - pad.left - pad.right
    const innerH = height - pad.top - pad.bottom

    const points = values.map((value, index) => {
      const x =
        pad.left + (index / Math.max(values.length - 1, 1)) * innerW
      const y = pad.top + innerH - (value / max) * innerH
      return { x, y, value, date: days[index]?.date ?? '' }
    })

    const gridLines = [0, 0.5, 1].map((ratio) => ({
      y: pad.top + innerH * (1 - ratio),
      label: ratio === 1 ? String(max) : ratio === 0 ? '0' : String(Math.round(max / 2)),
    }))

    let peakIndex = 0
    values.forEach((v, i) => {
      if (v >= (values[peakIndex] ?? 0)) peakIndex = i
    })

    const total = values.reduce((sum, n) => sum + n, 0)

    const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
    const areaPoints = [
      `${points[0]?.x ?? pad.left},${pad.top + innerH}`,
      ...points.map((p) => `${p.x},${p.y}`),
      `${points[points.length - 1]?.x ?? width - pad.right},${pad.top + innerH}`,
    ].join(' ')

    return {
      width,
      height,
      pad,
      innerH,
      points,
      gridLines,
      linePoints,
      areaPoints,
      max,
      peakIndex,
      peak: days[peakIndex],
      total,
      labelIndices: axisLabelIndices(days.length),
    }
  }, [perDay])

  if (perDay.length === 0) {
    return (
      <div
        className={clsx(
          'flex h-[148px] w-full max-w-[400px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-xs text-slate-400',
          className,
        )}
      >
        No trend data for this period
      </div>
    )
  }

  const active = activeIndex !== null ? chart.points[activeIndex] : null
  const showPeak = activeIndex === null

  return (
    <div className={clsx('w-full max-w-[400px]', className)}>
      <div className="relative overflow-hidden rounded-xl border border-[#e9d5ff]/60 bg-gradient-to-b from-[#faf8ff] to-white px-3 pb-3 pt-3 shadow-inner">
        {(active || (showPeak && chart.peak)) && (
          <div
            className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#decaff] bg-white px-2.5 py-1 text-center text-[10px] font-semibold text-[#7c3aed] shadow-sm"
            role="status"
          >
            {active ? (
              <>
                <span className="text-slate-500">{formatDayMonthYear(active.date)}</span>
                <span className="mx-1 text-slate-300">·</span>
                <span>{active.value} visit{active.value === 1 ? '' : 's'}</span>
              </>
            ) : chart.peak ? (
              <>
                Peak · {formatDayMonthYear(chart.peak.date)} · {chart.peak.count}{' '}
                visit{chart.peak.count === 1 ? '' : 's'}
              </>
            ) : null}
          </div>
        )}

        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-[132px] w-full"
          aria-label="Daily visits trend chart"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8a37ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8a37ff" stopOpacity="0.02" />
            </linearGradient>
            <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {chart.gridLines.map((line) => (
            <g key={line.y}>
              <line
                x1={chart.pad.left}
                x2={chart.width - chart.pad.right}
                y1={line.y}
                y2={line.y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={chart.pad.left - 4}
                y={line.y + 3}
                textAnchor="end"
                className="fill-slate-400 text-[8px]"
                style={{ fontSize: 8 }}
              >
                {line.label}
              </text>
            </g>
          ))}

          <polygon points={chart.areaPoints} fill={`url(#${gradientId})`} />
          <polyline
            points={chart.linePoints}
            fill="none"
            stroke="#8a37ff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            filter={`url(#${gradientId}-glow)`}
          />

          {chart.points.map((point, index) => {
            const isPeak = index === chart.peakIndex && (chart.peak?.count ?? 0) > 0
            const isActive = activeIndex === index
            return (
              <g
                key={`${point.date}-${index}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive || isPeak ? 10 : 8}
                  fill="transparent"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive ? 5 : isPeak ? 4.5 : 3}
                  fill={isActive || isPeak ? '#8a37ff' : '#fff'}
                  stroke="#8a37ff"
                  strokeWidth={isActive || isPeak ? 2.5 : 2}
                />
              </g>
            )
          })}
        </svg>

        <div className="flex justify-between px-1 text-[10px] font-medium text-slate-500">
          {chart.labelIndices.map((index) => (
            <span key={`${perDay[index]?.date}-${index}`}>
              {shortAxisDate(perDay[index]?.date ?? '')}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[11px] text-slate-500">
        <span>
          <span className="font-semibold text-slate-700">{chart.total}</span> visits in
          chart
        </span>
        {(chart.peak?.count ?? 0) > 0 && (
          <span>
            Peak{' '}
            <span className="font-semibold text-[#7c3aed]">{chart.peak?.count}</span>
            <span className="text-slate-400"> · </span>
            {shortAxisDate(chart.peak?.date ?? '')}
          </span>
        )}
      </div>
    </div>
  )
}
