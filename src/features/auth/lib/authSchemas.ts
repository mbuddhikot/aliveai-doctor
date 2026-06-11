import { z } from 'zod'

const EMAIL_MAX = 254
const PASSWORD_MAX = 128
const NAME_MAX = 60

export const emailField = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(EMAIL_MAX, 'Email is too long')
  .email('Enter a valid email address')

/** Login: length only (existing accounts may predate strength rules). */
export const signInPasswordField = z
  .string()
  .min(1, 'Password is required')
  .max(PASSWORD_MAX, 'Password is too long')

/** Registration and password reset. */
export const strongPasswordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(PASSWORD_MAX, 'Password is too long')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number')

export const personNameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .min(2, `${label} must be at least 2 characters`)
    .max(NAME_MAX, `${label} is too long`)
    .regex(
      /^[\p{L}\p{M}'\-\s.]+$/u,
      `${label} can only contain letters, spaces, hyphens, and apostrophes`,
    )

export const mobileNumberField = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .transform((value) => value.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .min(1, 'Phone number is required')
      .min(7, 'Enter at least 7 digits')
      .max(15, 'Phone number cannot exceed 15 digits'),
  )

export const signInSchema = z.object({
  email: emailField,
  password: signInPasswordField,
  remember: z.boolean().optional(),
})

export const signUpSchema = z.object({
  first_name: personNameField('First name'),
  last_name: personNameField('Last name'),
  email: emailField,
  mobile_number: mobileNumberField,
  password: strongPasswordField,
  accept_terms: z.boolean().refine((value) => value === true, {
    message: 'You must accept the terms to create an account',
  }),
})

export type SignInFormValues = z.infer<typeof signInSchema>
export type SignUpFormValues = z.infer<typeof signUpSchema>

export const PASSWORD_REQUIREMENTS_HINT =
  'At least 8 characters with uppercase, lowercase, and a number.'
