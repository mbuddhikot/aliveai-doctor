import { z } from 'zod'
import type { Country } from '../../../lib/countries'
import { formatPhoneWithDialCode } from '../../../lib/phone'
import { DEFAULT_PROFILE_TIMEZONE } from '../constants'
import type { DoctorProfileCreatePayload } from '../types'

/** Matches DoctorProfileCreateRequest in the backend OpenAPI spec. */
export const doctorProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(255, 'Full name is too long'),
  specialty: z
    .string()
    .trim()
    .min(2, 'Select your specialization')
    .max(128, 'Specialization is too long'),
  qualifications: z
    .string()
    .trim()
    .min(1, 'Add at least one qualification'),
  registration_number: z
    .string()
    .trim()
    .min(3, 'Registration number must be at least 3 characters')
    .max(64, 'Registration number is too long'),
  phone: z
    .string()
    .trim()
    .min(5, 'Enter a valid phone number')
    .max(20, 'Phone number is too long'),
  years_experience: z.coerce
    .number()
    .int('Years of experience must be a whole number')
    .min(0, 'Years of experience cannot be negative')
    .max(80, 'Years of experience must be 80 or less'),
  bio: z.string().trim().max(2000, 'Bio must be 2000 characters or less').optional(),
  fee_amount: z.coerce.number().min(0, 'Fee cannot be negative').optional(),
  fee_currency: z.string().trim().max(8, 'Currency code is too long').default('USD'),
  session_minutes: z.coerce
    .number()
    .int()
    .min(5, 'Session must be at least 5 minutes')
    .max(480, 'Session cannot exceed 480 minutes')
    .default(30),
  timezone: z
    .string()
    .trim()
    .min(1, 'Select your timezone')
    .default(DEFAULT_PROFILE_TIMEZONE),
})

export type DoctorProfileFormValues = z.infer<typeof doctorProfileSchema>

export function profileFormToPayload(
  values: DoctorProfileFormValues,
  country: Country,
): DoctorProfileCreatePayload {
  const qualifications = values.qualifications
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (qualifications.length === 0) {
    throw new Error('Add at least one qualification')
  }

  return {
    full_name: values.full_name.trim(),
    specialty: values.specialty.trim(),
    qualifications,
    registration_number: values.registration_number.trim(),
    phone: formatPhoneWithDialCode(values.phone, country),
    years_experience: values.years_experience,
    bio: values.bio?.trim() || null,
    fee_amount: values.fee_amount ?? null,
    fee_currency: values.fee_currency.trim() || 'USD',
    session_minutes: values.session_minutes,
    timezone: values.timezone.trim() || DEFAULT_PROFILE_TIMEZONE,
  }
}
