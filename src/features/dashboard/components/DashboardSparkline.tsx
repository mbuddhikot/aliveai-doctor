type DashboardSparklineProps = {
  values: number[]
  className?: string
}

export function DashboardSparkline({
  values,
  className = 'h-[72px] w-full max-w-[180px]',
}: DashboardSparklineProps) {
  if (values.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-slate-400 ${className}`}
      >
        No trend data
      </div>
    )
  }

  const max = Math.max(...values, 1)
  const width = 180
  const height = 72
  const padding = 6

  const points = values.map((value, index) => {
    const x =
      padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2)
    const y = height - padding - (value / max) * (height - padding * 2)
    return { x, y }
  })

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPoints = [
    `${points[0]?.x ?? padding},${height - padding}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1]?.x ?? width - padding},${height - padding}`,
  ].join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="dash-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a37ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#8a37ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#dash-spark-fill)" />
      <polyline
        points={linePoints}
        fill="none"
        stroke="#8a37ff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}
