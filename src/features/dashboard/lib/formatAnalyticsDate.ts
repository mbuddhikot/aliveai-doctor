/** Formats API date strings (e.g. 2026-05-05) as DD/MM/YYYY. */
export function formatDayMonthYear(dateStr: string): string {
  const trimmed = dateStr.trim()
  if (!trimmed) return dateStr

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (isoDate) {
    const [, year, month, day] = isoDate
    return `${day}/${month}/${year}`
  }

  const parsed = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T12:00:00`)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return dateStr
}

export function formatAnalyticsDateRange(from: string, to: string): string {
  return `${formatDayMonthYear(from)} – ${formatDayMonthYear(to)}`
}
