/** Display name for dashboard hero — adds "Dr." when missing. */
export function formatDoctorDisplayName(fullName: string): {
  displayName: string
  initials: string
} {
  const trimmed = fullName.trim() || 'Doctor'
  const hasDrPrefix = /^dr\.?\s/i.test(trimmed)
  const displayName = hasDrPrefix ? trimmed : `Dr. ${trimmed}`

  const initials = trimmed
    .replace(/^dr\.?\s/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return { displayName, initials: initials || 'DR' }
}
