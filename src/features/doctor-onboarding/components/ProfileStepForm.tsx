import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { PhoneNumberField } from '../../../components/common/PhoneNumberField'
import type { AuthUser } from '../../auth/types'
import { getSpecializations } from '../api/specializationsApi'
import {
  authUserToProfileDefaults,
  doctorProfileToFormValues,
  resolveProfileCountry,
} from '../lib/profileMappers'
import {
  doctorProfileSchema,
  profileFormToPayload,
  type DoctorProfileFormValues,
} from '../lib/profileSchema'
import type { DoctorProfile } from '../types'
import { extractApiErrorMessage } from '../../../lib/apiClient'

type ProfileStepFormProps = {
  user: AuthUser | null
  savedProfile: DoctorProfile | null | undefined
  profileLoading: boolean
  profileCompleted: boolean
  isSaving: boolean
  saveError: unknown
  onSubmit: (payload: ReturnType<typeof profileFormToPayload>) => void
  /** Dashboard profile page uses different copy than onboarding. */
  variant?: 'onboarding' | 'dashboard'
}

export function ProfileStepForm({
  user,
  savedProfile,
  profileLoading,
  profileCompleted,
  isSaving,
  saveError,
  onSubmit,
  variant = 'onboarding',
}: ProfileStepFormProps) {
  const isDashboard = variant === 'dashboard'
  const initialCountry = useMemo(
    () => resolveProfileCountry(user, savedProfile),
    [user, savedProfile],
  )
  const [country, setCountry] = useState(initialCountry)

  const specializationsQuery = useQuery({
    queryKey: ['specializations'],
    queryFn: getSpecializations,
    staleTime: 5 * 60_000,
  })

  const specializations = specializationsQuery.data?.data ?? []

  const defaultFormValues = useMemo(() => {
    if (savedProfile) {
      return doctorProfileToFormValues(savedProfile, initialCountry)
    }
    return authUserToProfileDefaults(user, initialCountry)
  }, [savedProfile, user, initialCountry])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DoctorProfileFormValues>({
    resolver: zodResolver(doctorProfileSchema),
    defaultValues: defaultFormValues,
  })

  useEffect(() => {
    if (profileLoading) return
    reset(defaultFormValues)
    setCountry(
      savedProfile
        ? resolveProfileCountry(user, savedProfile)
        : initialCountry,
    )
  }, [defaultFormValues, profileLoading, reset, savedProfile, user, initialCountry])

  const rootMessage =
    errors.root?.message ||
    (saveError ? extractApiErrorMessage(saveError, 'Unable to save profile') : null)

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit(profileFormToPayload(values, country)),
      )}
      className="space-y-8"
      noValidate
    >
      {!isDashboard && (
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.5px] text-black">
            Professional profile
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#878787]">
            This information is shown to patients after verification and is reviewed
            by our compliance team.
          </p>
          {profileLoading && (
            <p className="mt-2 text-sm text-[#64748b]">Loading saved profile…</p>
          )}
        </div>
      )}
      {isDashboard && profileLoading && (
        <p className="text-sm text-[#64748b]">Loading saved profile…</p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <FormField label="Full name" error={errors.full_name?.message}>
          <input
            className={inputClass(Boolean(errors.full_name))}
            autoComplete="name"
            disabled={profileLoading || isSaving}
            {...register('full_name')}
          />
        </FormField>

        <FormField label="Specialization" error={errors.specialty?.message}>
          {specializationsQuery.isLoading ? (
            <div className="flex h-[50px] items-center rounded-[10px] border border-[#b6b6b8] bg-[#fafafa] px-4 text-sm text-[#878787]">
              Loading specializations…
            </div>
          ) : specializationsQuery.isError ? (
            <div className="space-y-2">
              <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {extractApiErrorMessage(
                  specializationsQuery.error,
                  'Unable to load specializations',
                )}
              </div>
              <button
                type="button"
                onClick={() => void specializationsQuery.refetch()}
                className="text-sm font-semibold text-[#8a37ff] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : specializations.length === 0 ? (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No specializations are available yet. Please try again later.
            </div>
          ) : (
            <select
              className={clsx(
                inputClass(Boolean(errors.specialty)),
                !errors.specialty && 'text-black',
                'appearance-none bg-white bg-[length:16px] bg-[right_16px_center] bg-no-repeat',
              )}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              }}
              disabled={profileLoading || isSaving}
              {...register('specialty')}
            >
              <option value="" disabled>
                Select your specialization
              </option>
              {specializations.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField
          label="Qualifications"
          hint="Separate multiple with commas (e.g. MBBS, MD)"
          error={errors.qualifications?.message}
        >
          <input
            className={inputClass(Boolean(errors.qualifications))}
            placeholder="MBBS, MD, DNB"
            disabled={profileLoading || isSaving}
            {...register('qualifications')}
          />
        </FormField>

        <FormField
          label="Registration number"
          hint="Medical council registration or license number"
          error={errors.registration_number?.message}
        >
          <input
            className={inputClass(Boolean(errors.registration_number))}
            disabled={profileLoading || isSaving}
            {...register('registration_number')}
          />
        </FormField>

        <div className="md:col-span-2">
          <PhoneNumberField
            country={country}
            onCountryChange={setCountry}
            error={errors.phone?.message}
            disabled={profileLoading || isSaving}
            inputProps={register('phone')}
          />
        </div>

        <FormField
          label="Years of experience"
          error={errors.years_experience?.message}
        >
          <input
            type="number"
            min={0}
            max={80}
            className={inputClass(Boolean(errors.years_experience))}
            disabled={profileLoading || isSaving}
            {...register('years_experience')}
          />
        </FormField>

        <FormField label="Consultation fee" error={errors.fee_amount?.message}>
          <input
            type="number"
            min={0}
            className={inputClass(Boolean(errors.fee_amount))}
            placeholder="Optional"
            disabled={profileLoading || isSaving}
            {...register('fee_amount')}
          />
        </FormField>

        <FormField label="Currency" error={errors.fee_currency?.message}>
          <input
            maxLength={8}
            readOnly
            className={clsx(
              inputClass(Boolean(errors.fee_currency)),
              'bg-[#fafafa] font-semibold text-[#8a37ff]',
            )}
            disabled={profileLoading || isSaving}
            {...register('fee_currency')}
          />
        </FormField>

        <FormField
          label="Session (minutes)"
          error={errors.session_minutes?.message}
        >
          <input
            type="number"
            min={5}
            max={480}
            className={inputClass(Boolean(errors.session_minutes))}
            disabled={profileLoading || isSaving}
            {...register('session_minutes')}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Bio" error={errors.bio?.message}>
            <textarea
              rows={4}
              maxLength={2000}
              className={clsx(inputClass(Boolean(errors.bio)), 'h-auto resize-y py-3')}
              placeholder="Brief introduction for patients (optional)"
              disabled={profileLoading || isSaving}
              {...register('bio')}
            />
          </FormField>
        </div>
      </div>

      {rootMessage && (
        <p
          role="alert"
          className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {rootMessage}
        </p>
      )}

      <div className="flex justify-end border-t border-[#eef1f5] pt-6">
        <button
          type="submit"
          disabled={
            profileLoading ||
            isSaving ||
            specializationsQuery.isLoading ||
            specializations.length === 0
          }
          className="h-12 min-w-[180px] rounded-[10px] bg-[#8a37ff] px-8 text-base font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving
            ? 'Saving…'
            : isDashboard
              ? 'Save changes'
              : profileCompleted
                ? 'Update & continue'
                : 'Save & continue'}
        </button>
      </div>
    </form>
  )
}

function inputClass(hasError: boolean) {
  return clsx(
    'h-[50px] w-full rounded-[10px] border px-4 text-base text-black outline-none transition placeholder:text-[#878787]',
    hasError
      ? 'border-red-300 focus:border-red-400'
      : 'border-[#b6b6b8] focus:border-[#8a37ff]',
  )
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-black">{label}</span>
      {hint && <span className="block text-xs text-[#878787]">{hint}</span>}
      {children}
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  )
}
