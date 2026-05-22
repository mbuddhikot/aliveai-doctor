import {
  DEFAULT_COUNTRY_ISO2,
  findCountryByIso2,
  type Country,
} from '../../../lib/countries'
import { findCountryByDialCode, parseStoredPhone } from '../../../lib/phone'
import type { AuthUser } from '../../auth/types'
import { formatDoctorFullName } from '../../auth/utils/doctorName'
import { DEFAULT_PROFILE_TIMEZONE } from '../constants'
import type { DoctorProfile } from '../types'
import type { DoctorProfileFormValues } from './profileSchema'

const FALLBACK_COUNTRY: Country = {
  iso2: DEFAULT_COUNTRY_ISO2,
  name: 'United States',
  dial_code: '+1',
}

export function resolveProfileCountry(
  user: AuthUser | null,
  profile?: DoctorProfile | null,
): Country {
  const fromProfile = profile?.phone
    ? parseStoredPhone(profile.phone, FALLBACK_COUNTRY).country
    : undefined
  if (fromProfile) return fromProfile

  const fromUser =
    findCountryByDialCode(user?.country_code) ??
    findCountryByIso2(DEFAULT_COUNTRY_ISO2)
  return fromUser ?? FALLBACK_COUNTRY
}

export function authUserToProfileDefaults(
  user: AuthUser | null,
  country: Country,
): DoctorProfileFormValues {
  const fromMobile = user?.mobile_number?.trim()
  const parsed = parseStoredPhone(fromMobile, country)

  return {
    full_name: formatDoctorFullName(
      user?.first_name,
      user?.last_name,
      user?.name,
    ),
    specialty: '',
    qualifications: '',
    registration_number: '',
    phone: parsed.local,
    years_experience: 0,
    bio: '',
    fee_amount: undefined,
    fee_currency: 'USD',
    session_minutes: 30,
    timezone: DEFAULT_PROFILE_TIMEZONE,
  }
}

export function doctorProfileToFormValues(
  profile: DoctorProfile,
  country: Country,
): DoctorProfileFormValues {
  const parsed = parseStoredPhone(profile.phone ?? '', country)

  return {
    full_name: profile.full_name?.trim() ?? '',
    specialty: profile.specialty?.trim() ?? '',
    qualifications: (profile.qualifications ?? []).join(', '),
    registration_number: profile.registration_number?.trim() ?? '',
    phone: parsed.local,
    years_experience: profile.years_experience ?? 0,
    bio: profile.bio?.trim() ?? '',
    fee_amount: profile.fee_amount ?? undefined,
    fee_currency:
      profile.fee_currency?.trim() === 'INR' || !profile.fee_currency?.trim()
        ? 'USD'
        : profile.fee_currency.trim(),
    session_minutes: profile.session_minutes ?? 30,
    timezone: profile.timezone?.trim() || DEFAULT_PROFILE_TIMEZONE,
  }
}

export function profileExists(profile: DoctorProfile | null | undefined): boolean {
  return Boolean(profile?.id)
}
