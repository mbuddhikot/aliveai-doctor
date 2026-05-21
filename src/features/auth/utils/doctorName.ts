export const DOCTOR_TITLE = 'Dr.'

/** Build display name with Dr. prefix for doctor accounts. */
export function formatDoctorFullName(
  firstName?: string,
  lastName?: string,
  existingName?: string,
): string {
  const fromParts = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ')
  const base = existingName?.trim() || fromParts
  if (!base) return ''
  if (/^dr\.?\s/i.test(base)) return base
  return `${DOCTOR_TITLE} ${base}`
}
