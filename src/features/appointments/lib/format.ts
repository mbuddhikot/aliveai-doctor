export function formatAppointmentDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatAppointmentDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatAppointmentTimeRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (Number.isNaN(start.getTime())) return ''
  const timeFmt = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  })
  if (Number.isNaN(end.getTime())) return timeFmt.format(start)
  return `${timeFmt.format(start)} – ${timeFmt.format(end)}`
}

export function formatFee(amount?: number | null, currency?: string | null): string | null {
  if (amount == null || !Number.isFinite(amount)) return null
  const code = currency?.trim() || 'INR'
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${code} ${amount}`
  }
}

export function isoToDateInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isoToTimeInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function isAppointmentUpcoming(appointment: {
  status: string
  starts_at: string
}): boolean {
  if (appointment.status === 'cancelled' || appointment.status === 'past') {
    return false
  }
  return new Date(appointment.starts_at).getTime() >= Date.now()
}
