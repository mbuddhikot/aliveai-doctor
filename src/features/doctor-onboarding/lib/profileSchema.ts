import { z } from 'zod'
import type { Country } from '../../../lib/countries'
import { formatPhoneWithDialCode } from '../../../lib/phone'

export const doctorProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name'),
  specialty: z.string().trim().min(1, 'Select your specialization'),
  qualifications: z.string().trim().min(1, 'Add at least one qualification'),
  registration_number: z
    .string()
    .trim()
    .min(3, 'Enter a valid registration number'),
  phone: z.string().trim().min(5, 'Enter a valid phone number'),
  years_experience: z.coerce
    .number()
    .min(0, 'Years of experience cannot be negative')
    .max(80, 'Years of experience must be 80 or less'),
  bio: z.string().trim().max(2000).optional(),
  fee_amount: z.coerce.number().min(0, 'Fee cannot be negative').optional(),
  fee_currency: z.string().trim().max(8).default('INR'),
  session_minutes: z.coerce
    .number()
    .min(5, 'Session must be at least 5 minutes')
    .max(480, 'Session cannot exceed 480 minutes')
    .default(30),
})

export type DoctorProfileFormValues = z.infer<typeof doctorProfileSchema>

export function profileFormToPayload(
  values: DoctorProfileFormValues,
  country: Country,
) {
  return {
    full_name: values.full_name.trim(),
    specialty: values.specialty.trim(),
    qualifications: values.qualifications
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    registration_number: values.registration_number.trim(),
    phone: formatPhoneWithDialCode(values.phone, country),
    years_experience: values.years_experience,
    bio: values.bio?.trim() || null,
    fee_amount: values.fee_amount ?? null,
    fee_currency: values.fee_currency.trim() || 'INR',
    session_minutes: values.session_minutes,
  }
}
