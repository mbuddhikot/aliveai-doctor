import type { DoctorDocumentType, DoctorVerificationStatus } from './types'

export type OnboardingStep = 'profile' | 'documents' | 'review'

/** IANA timezones supported by POST /v1/doctor/profile (see OpenAPI). */
export const PROFILE_TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/New_York', label: 'Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'Central (America/Chicago)' },
  { value: 'America/Denver', label: 'Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (America/Los_Angeles)' },
  { value: 'America/Phoenix', label: 'Arizona (America/Phoenix)' },
  { value: 'America/Anchorage', label: 'Alaska (America/Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Pacific/Honolulu)' },
  { value: 'Asia/Kolkata', label: 'India (Asia/Kolkata)' },
  { value: 'UTC', label: 'UTC' },
]

export const DEFAULT_PROFILE_TIMEZONE = 'America/New_York'

export const ONBOARDING_STEPS: { id: OnboardingStep; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
]

export const DOCUMENT_OPTIONS: {
  value: DoctorDocumentType
  label: string
  hint: string
}[] = [
  {
    value: 'license',
    label: 'Medical license',
    hint: 'Required for verification',
  },
  {
    value: 'degree',
    label: 'Degree certificate',
    hint: 'MBBS, MD, or equivalent',
  },
  {
    value: 'id_proof',
    label: 'Government ID',
    hint: 'Passport, Aadhaar, or national ID',
  },
  {
    value: 'experience_certificate',
    label: 'Experience certificate',
    hint: 'Optional but speeds up review',
  },
  {
    value: 'other',
    label: 'Other document',
    hint: 'Any supporting credential',
  },
]

export const RECOMMENDED_DOC_TYPES: DoctorDocumentType[] = [
  'license',
  'degree',
  'id_proof',
]

export const STATUS_META: Record<
  DoctorVerificationStatus,
  { label: string; tone: string; message: string }
> = {
  none: {
    label: 'Not submitted',
    tone: 'bg-slate-100 text-slate-700',
    message:
      'Tell us about your practice and upload credentials so our team can verify your account.',
  },
  pending: {
    label: 'Under review',
    tone: 'bg-amber-100 text-amber-800',
    message:
      'Your profile is with our verification team. We will email you when your account is approved.',
  },
  verified: {
    label: 'Verified',
    tone: 'bg-emerald-100 text-emerald-700',
    message: 'Your doctor account is verified. Opening your dashboard…',
  },
  rejected: {
    label: 'Action required',
    tone: 'bg-red-100 text-red-700',
    message:
      'Update the details below and re-upload corrected documents, then submit again for review.',
  },
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const
