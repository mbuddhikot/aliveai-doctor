import { COUNTRIES, type Country } from './countries'

/** Strip spaces and a leading dial code from the local number input. */
export function cleanLocalPhoneNumber(localPhone: string, dialCode: string): string {
  return localPhone
    .replace(/\s+/g, '')
    .replace(new RegExp(`^\\${dialCode}`), '')
}

/** Full phone string for API payloads (e.g. +919876543210). */
export function formatPhoneWithDialCode(localPhone: string, country: Country): string {
  const cleaned = cleanLocalPhoneNumber(localPhone, country.dial_code)
  return `${country.dial_code}${cleaned}`
}

export function findCountryByDialCode(dialCode: string | null | undefined): Country | undefined {
  if (!dialCode?.trim()) return undefined
  const normalized = dialCode.trim().startsWith('+')
    ? dialCode.trim()
    : `+${dialCode.trim()}`
  return COUNTRIES.find((country) => country.dial_code === normalized)
}

/** Split a stored full phone into country + local part when possible. */
export function parseStoredPhone(
  phone: string | null | undefined,
  fallbackCountry: Country,
): { country: Country; local: string } {
  const raw = phone?.trim() || ''
  if (!raw) return { country: fallbackCountry, local: '' }

  const matched = [...COUNTRIES]
    .sort((a, b) => b.dial_code.length - a.dial_code.length)
    .find((country) => raw.startsWith(country.dial_code))

  if (matched) {
    return {
      country: matched,
      local: raw.slice(matched.dial_code.length),
    }
  }

  return { country: fallbackCountry, local: raw }
}
